package com.dalmiahardware.catalog

import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.Locale
import kotlin.math.abs

// Matches the JSON returned by the get_catalog RPC and bundled in catalog.json.
data class Source(val document: String, val page: Int)
data class Variant(
    val finish: String,
    val thickness: String?,
    val prices: LinkedHashMap<String, Double?>,
    val unit: String,
    val box: Double?,
    val boxUnit: String?,
    val weight: String?,
)
data class Product(
    val id: String,
    val model: String,
    val category: String,
    val variants: List<Variant>,
    val sources: List<Source>,
    val image: String?,
    val notes: List<String>,
    val specs: List<String>,
    val sizes: List<String>,
    val minPrice: Double?,
    val searchText: String,
    val model3d: String? = null,
) {
    val perInch get() = variants.any { it.unit == "Per inch" }
}
data class SourceDocument(val id: String, val file: String)
data class Catalog(val products: List<Product>, val documents: List<SourceDocument>, val priceNote: String)

private fun JSONObject.text(name: String) = if (isNull(name)) null else getString(name)
private fun JSONObject.number(name: String) = if (isNull(name)) null else getDouble(name)
private fun <T> JSONArray.objects(map: (JSONObject) -> T) = List(length()) { map(getJSONObject(it)) }

// Returns null for anything that is not a complete catalog with unique product ids.
fun parseCatalog(json: String): Catalog? = runCatching {
    val root = JSONObject(json)
    val products = root.getJSONArray("products").objects { p ->
        Product(
            id = p.getString("id"),
            model = p.getString("model"),
            category = p.getString("category"),
            variants = p.getJSONArray("variants").objects { v ->
                val prices = v.getJSONObject("prices")
                Variant(
                    finish = v.getString("finish"),
                    thickness = v.text("thickness"),
                    // ponytail: sizes use natural order rather than JSON key order, matching iOS and every current price list.
                    prices = prices.keys().asSequence().sortedWith(naturalOrder).associateWithTo(LinkedHashMap()) { prices.number(it) },
                    unit = v.getString("unit"),
                    box = v.number("box"),
                    boxUnit = v.text("boxUnit"),
                    weight = v.text("weight"),
                )
            },
            sources = p.getJSONArray("sources").objects { Source(it.getString("document"), it.getInt("page")) },
            image = p.getJSONArray("images").objects { it.getString("src") }.firstOrNull(),
            notes = p.getJSONArray("notes").strings(),
            specs = p.getJSONArray("specs").strings(),
            sizes = p.getJSONArray("sizes").strings(),
            minPrice = p.number("minPrice"),
            searchText = p.getString("searchText"),
            model3d = if (p.has("model3d")) p.text("model3d") else null,
        )
    }
    require(products.map { it.id }.toSet().size == products.size)
    Catalog(products, root.getJSONArray("documents").objects { SourceDocument(it.getString("id"), it.getString("file")) }, root.getString("priceNote"))
}.getOrNull()

val categoryOrder = listOf("Door handles", "Knobs", "Sofa legs", "Profile handles", "Concealed handles", "Brackets")

// Compares runs of digits by value, so "DH-2" sorts before "DH-10".
val naturalOrder = Comparator<String> { a, b ->
    val chunks = Regex("\\d+|\\D+")
    val left = chunks.findAll(a.lowercase()).map { it.value }.toList()
    val right = chunks.findAll(b.lowercase()).map { it.value }.toList()
    for ((x, y) in left.zip(right)) {
        val result = if (x[0].isDigit() && y[0].isDigit()) x.toBigInteger().compareTo(y.toBigInteger()) else x.compareTo(y)
        if (result != 0) return@Comparator result
    }
    left.size - right.size
}

fun discoveryOrder(products: List<Product>) =
    products.sortedWith(compareBy<Product> { categoryOrder.indexOf(it.category) }.thenBy(naturalOrder) { it.model })

fun normalize(value: String) = value.lowercase().filter { it in 'a'..'z' || it in '0'..'9' }

private val modelNumber = Regex("(dh)?\\d{3,4}")

fun findProducts(products: List<Product>, query: String, category: String, saved: Set<String>?): List<Product> {
    val tokens = query.trim().split(Regex("\\s+")).map(::normalize).filter { it.isNotEmpty() }
    return products.filter { product ->
        (category.isEmpty() || product.category == category) && (saved == null || product.id in saved) && tokens.all { token ->
            if (modelNumber.matches(token)) token in normalize(product.model) else token in normalize(product.searchText)
        }
    }
}

enum class SwipeAction { Save, Next }

// Distances are dp and velocity is dp per second.
fun swipeAction(dx: Float, dy: Float, velocityX: Float = 0f): SwipeAction? {
    if (abs(dx) < abs(dy) * 1.3f) return null
    if (abs(dx) < 84 && !(abs(dx) > 40 && abs(velocityX) > 700)) return null
    return if (dx > 0) SwipeAction.Save else SwipeAction.Next
}

fun nextIndex(index: Int, count: Int) = if (count > 0) (index + 1) % count else 0

val priceFields = listOf(
    "65% off" to 3500.0, "75% off" to 2500.0, "65% off + 18%" to 4130.0,
    "75% off + 18%" to 2950.0, "65% off + 9%" to 3815.0, "75% off + 9%" to 2725.0,
)

fun calculatedPrices(listed: Double?): List<Double?> =
    priceFields.map { (_, factor) -> listed?.let { Math.round(it * factor / 100 + Math.ulp(1.0)) / 100.0 } }

// Indian digit grouping (1,23,456.50), the same as Intl.NumberFormat('en-IN').
fun priceAmount(value: Double?): String {
    if (value == null) return "—"
    val (whole, fraction) = String.format(Locale.ROOT, "%.2f", abs(value)).split(".")
    val grouped = if (whole.length <= 3) whole else whole.dropLast(3).reversed().chunked(2).joinToString(",").reversed() + "," + whole.takeLast(3)
    return (if (value < 0) "-" else "") + grouped + "." + fraction
}

// Catalog records keep object paths in the public catalog-media bucket.
fun catalogMediaUrl(path: String, supabaseUrl: String): String? {
    if (supabaseUrl.isEmpty()) return null
    val origin = "${supabaseUrl.trimEnd('/')}/storage/v1/object/public/catalog-media/"
    if (path.startsWith("http://") || path.startsWith("https://")) return path.takeIf { it.startsWith(origin) }
    return origin + path.trimStart('/').split("/").joinToString("/") {
        URLEncoder.encode(it, "UTF-8").replace("+", "%20").replace("%21", "!").replace("%27", "'")
            .replace("%28", "(").replace("%29", ")").replace("%7E", "~")
    }
}

fun catalogDocumentUrl(document: SourceDocument, page: Int, supabaseUrl: String) =
    catalogMediaUrl("documents/${document.file}", supabaseUrl)?.let { if (page > 0) "$it#page=$page" else it }
