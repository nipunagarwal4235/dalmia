package com.dalmiahardware.catalog

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.File

class CatalogTest {
    private val catalog = parseCatalog(File("src/main/assets/catalog.json").readText())!!
    private val products = catalog.products

    @Test fun bundledCatalog() {
        assertEquals(149, products.size)
        assertEquals(5, catalog.documents.size)
        assertEquals(148, products.count { it.image != null })
        assertEquals(938, products.sumOf { p -> p.variants.sumOf { v -> v.prices.values.count { it != null } } })
        assertEquals(listOf("8 in", "12 in", "16 in", "18 in", "24 in"), products.first { it.model == "1711" }.variants[0].prices.keys.toList())
    }

    @Test fun swipesAndPaging() {
        assertEquals(SwipeAction.Save, swipeAction(130f, 12f))
        assertEquals(SwipeAction.Next, swipeAction(-130f, 12f))
        assertNull(swipeAction(10f, 160f)); assertNull(swipeAction(60f, 90f)); assertNull(swipeAction(25f, 3f))
        assertEquals(SwipeAction.Save, swipeAction(50f, 4f, 1100f))
        assertEquals(SwipeAction.Next, swipeAction(-50f, 4f, -1100f))
        assertNull(swipeAction(4f, 2f, 2000f))
        assertEquals(listOf(1, 0, 0, 0), listOf(nextIndex(0, 149), nextIndex(148, 149), nextIndex(0, 1), nextIndex(0, 0)))
    }

    @Test fun search() {
        assertEquals("DH-1501", findProducts(products, "DH1501", "", null)[0].model)
        assertEquals("DH-1501", findProducts(products, "DH 1501", "", null)[0].model)
        assertEquals(listOf("2605"), findProducts(products, "2605", "", null).map { it.model })
        assertEquals(46, findProducts(products, "", "Door handles", null).size)
        val match = products.first { it.model == "2601" }
        assertEquals(1, findProducts(products, "2601", "Door handles", setOf(match.id)).size)
        assertEquals(0, findProducts(products, "", "", emptySet()).size)
        assertEquals(listOf("DH-2", "DH-10"), listOf("DH-10", "DH-2").sortedWith(naturalOrder))
    }

    @Test fun prices() {
        assertEquals(listOf(350.0, 250.0, 413.0, 295.0, 381.5, 272.5), calculatedPrices(1000.0))
        assertEquals(listOf(10.5, 7.5, 12.39, 8.85, 11.45, 8.18), calculatedPrices(30.0))
        assertEquals(List(6) { null }, calculatedPrices(null))
        assertEquals("1,23,456.50", priceAmount(123456.5))
        assertEquals("https://x.supabase.co/storage/v1/object/public/catalog-media/products/a%20b.png", catalogMediaUrl("products/a b.png", "https://x.supabase.co/"))
        assertNull(catalogMediaUrl("https://evil.example/a.png", "https://x.supabase.co"))
    }
}
