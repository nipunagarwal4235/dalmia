package com.dalmiahardware.catalog

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import android.annotation.SuppressLint
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ProductDetails(product: Product, catalog: Catalog, saved: Boolean, onClose: () -> Unit, onToggle: () -> Unit) {
    val context = LocalContext.current
    var variantIndex by remember(product.id) { mutableIntStateOf(0) }
    var selectedSize by remember(product.id) { mutableStateOf("") }
    var showModel by remember(product.id) { mutableStateOf(false) }
    val modelUrl = viewerUrl(product)
    val variant = product.variants.getOrNull(variantIndex)
    val sizes = variant?.prices?.keys?.toList().orEmpty()
    val size = if (selectedSize in sizes) selectedSize else sizes.firstOrNull()
    val listed = variant?.prices?.get(size)

    fun open(source: Source) {
        val url = catalog.documents.find { it.id == source.document }?.let { catalogDocumentUrl(it, source.page, BuildConfig.SUPABASE_URL) } ?: return
        try {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (_: ActivityNotFoundException) {
            Toast.makeText(context, "Document unavailable. Connect to the internet and try again.", Toast.LENGTH_LONG).show()
        }
    }

    if (showModel && modelUrl != null) ModelViewer(modelUrl, product.model) { showModel = false }
    Column(Modifier.fillMaxSize().background(Palette.black).safeDrawingPadding().clickable(enabled = false) {}) {
        Row(Modifier.fillMaxWidth().height(58.dp).padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton("back", Color.White, "Close product details", size = 24, onClick = onClose)
            Text("PRODUCT DETAILS", Modifier.weight(1f), style = style(10, Color(0xFFEEEEEE), FontWeight.Bold, 2f).copy(textAlign = androidx.compose.ui.text.style.TextAlign.Center))
            Box(Modifier.size(44.dp).clickable(role = Role.Button, onClick = onToggle).semantics { this.selected = saved }, contentAlignment = Alignment.Center) {
                Icon("heart", 24, Palette.gold, filled = saved)
            }
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(Palette.line))
        Column(Modifier.verticalScroll(rememberScrollState()).padding(start = 22.dp, end = 22.dp, top = 22.dp, bottom = 40.dp)) {
            if (product.image != null) {
                CatalogImage(product, Modifier.fillMaxWidth().height(265.dp).clip(RoundedCornerShape(5.dp)).background(Palette.silver))
                Spacer(Modifier.height(if (modelUrl != null) 12.dp else 24.dp))
            }
            if (modelUrl != null) {
                Box(
                    Modifier.fillMaxWidth().height(44.dp).background(Palette.gold, RoundedCornerShape(4.dp)).clickable(role = Role.Button) { showModel = true },
                    contentAlignment = Alignment.Center,
                ) { Text("View in 3D", style = style(13, Palette.black, FontWeight.SemiBold)) }
                Spacer(Modifier.height(24.dp))
            }
            Text(product.category.uppercase(), style = style(9, Palette.gold, FontWeight.Bold, 2f))
            Text(product.model, Modifier.padding(vertical = 8.dp), style = style(36, Color.White, FontWeight.Bold))
            if (product.specs.isNotEmpty()) Text(product.specs.joinToString(" · "), style = style(13, Palette.muted, lineHeight = 21))
            Title("Finish and size")
            if (variant != null) {
                Label("FINISH / COLOR")
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(bottom = 17.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    product.variants.forEachIndexed { i, v ->
                        Chip(listOfNotNull(v.finish, v.thickness, v.weight).joinToString(" · "), i == variantIndex) { variantIndex = i; selectedSize = "" }
                    }
                }
                Label("SIZE")
                FlowRow(Modifier.padding(bottom = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    sizes.forEach { item -> Chip(item, item == size) { selectedSize = item } }
                }
                Row(Modifier.fillMaxWidth().background(Color(0xFF262626), RoundedCornerShape(5.dp)).padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Label("LISTED PRICE")
                        Text(variant.unit, style = style(12, Color(0xFFDDDDDD)))
                    }
                    Text(if (listed == null) "Not listed" else priceAmount(listed), style = style(25, Color.White, FontWeight.Bold))
                }
                Title("Calculated prices")
                priceFields.zip(calculatedPrices(listed)).chunked(2).forEach { row ->
                    Row(Modifier.padding(bottom = 10.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { (field, value) ->
                            Column(Modifier.weight(1f).background(Palette.charcoal, RoundedCornerShape(4.dp)).border(1.dp, Color(0xFF383838), RoundedCornerShape(4.dp)).padding(15.dp)) {
                                Text(field.first, Modifier.padding(bottom = 8.dp), style = style(10, Color(0xFFBBBBBB)))
                                Text(priceAmount(value), style = style(19, Palette.gold, FontWeight.SemiBold).copy(fontFeatureSettings = "tnum"))
                            }
                        }
                    }
                }
                Note("The discount applies first. Then 18% or 9% is added to the discounted amount. Results use two decimal places.")
                if (variant.unit == "Per inch") Warning("All amounts are per inch, not the total price of a handle.")
                if (listed == null) Warning("The source does not list a price for this size.")
                variant.box?.takeIf { it > 0 }?.let { Note("Box quantity: ${if (it % 1 == 0.0) it.toLong() else it} ${variant.boxUnit ?: "pcs"}") }
            } else {
                Warning("No price is listed for this model in the supplied documents.")
            }
            product.notes.forEach { Warning(it) }
            Title("Original documents")
            Note("PDF links need an internet connection.")
            product.sources.forEach { source ->
                Column(Modifier.fillMaxWidth().clickable(role = Role.Button) { open(source) }) {
                    Row(Modifier.padding(vertical = 15.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(15.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text(catalog.documents.find { it.id == source.document }?.file.orEmpty(), style = style(12, Color(0xFFEEEEEE)))
                            Text("Page ${source.page}", Modifier.padding(top = 5.dp), style = style(10, Palette.muted))
                        }
                        Icon("external", 18, Palette.gold)
                    }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(Color(0xFF333333)))
                }
            }
            Spacer(Modifier.height(10.dp))
            Note(catalog.priceNote)
        }
    }
}

@Composable
private fun Chip(title: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        title,
        Modifier.background(if (selected) Palette.gold else Color(0xFF282828), RoundedCornerShape(4.dp))
            .border(1.dp, if (selected) Palette.gold else Color(0xFF474747), RoundedCornerShape(4.dp))
            .clickable(role = Role.Button, onClick = onClick).semantics { this.selected = selected }
            .padding(vertical = 10.dp, horizontal = 13.dp),
        style = style(12, if (selected) Palette.black else Color(0xFFDDDDDD), if (selected) FontWeight.SemiBold else FontWeight.Normal),
    )
}

@Composable
private fun Title(text: String) = Text(text, Modifier.padding(top = 26.dp, bottom = 14.dp), style = style(17, Color.White, FontWeight.SemiBold))

@Composable
private fun Label(text: String) = Text(text, Modifier.padding(bottom = 8.dp), style = style(8, Palette.muted, FontWeight.SemiBold, 1.5f))

@Composable
private fun Note(text: String) = Text(text, Modifier.padding(top = 12.dp), style = style(11, Color(0xFFA2A2A2), lineHeight = 19))

@Composable
private fun Warning(text: String) {
    Row(Modifier.padding(top = 14.dp).fillMaxWidth().height(IntrinsicSize.Min).background(Color(0xFF30291D))) {
        Box(Modifier.width(2.dp).fillMaxHeight().background(Palette.gold))
        Text(text, Modifier.padding(14.dp), style = style(12, Color(0xFFE1C995), lineHeight = 20))
    }
}

// The web app's /view3d page: an interactive model with finish buttons.
fun viewerUrl(product: Product): String? {
    val path = product.model3d ?: return null
    if (!path.startsWith("models/") || !path.endsWith(".glb")) return null
    return "$SITE_URL/view3d?m=${path.removePrefix("models/").removeSuffix(".glb")}"
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun ModelViewer(url: String, title: String, onClose: () -> Unit) {
    Dialog(onDismissRequest = onClose, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Column(Modifier.fillMaxSize().background(Color(0xFFF7F7F8)).safeDrawingPadding()) {
            Row(Modifier.fillMaxWidth().height(52.dp).background(Palette.black).padding(horizontal = 14.dp), verticalAlignment = Alignment.CenterVertically) {
                IconButton("close", Color.White, "Close 3D view", size = 22, onClick = onClose)
                Text(title, Modifier.weight(1f), style = style(15, Color.White, FontWeight.SemiBold).copy(textAlign = androidx.compose.ui.text.style.TextAlign.Center))
                Spacer(Modifier.width(44.dp))
            }
            AndroidView(
                factory = { context ->
                    WebView(context).apply {
                        settings.javaScriptEnabled = true
                        settings.domStorageEnabled = true
                        setBackgroundColor(0xFFF7F7F8.toInt())
                        webViewClient = object : WebViewClient() {
                            // The AR button opens Google's Scene Viewer through an intent:// link.
                            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                                val link = request.url.toString()
                                if (!link.startsWith("intent://")) return false
                                runCatching { context.startActivity(Intent.parseUri(link, Intent.URI_INTENT_SCHEME)) }
                                    .onFailure { Toast.makeText(context, "AR is not available on this phone.", Toast.LENGTH_LONG).show() }
                                return true
                            }
                        }
                        loadUrl(url)
                    }
                },
                modifier = Modifier.fillMaxSize(),
            )
        }
    }
}
