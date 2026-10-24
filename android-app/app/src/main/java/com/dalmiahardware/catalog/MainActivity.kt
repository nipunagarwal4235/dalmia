package com.dalmiahardware.catalog

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

object Palette {
    val black = Color(0xFF101010)
    val charcoal = Color(0xFF222222)
    val panel = Color(0xFF171717)
    val silver = Color(0xFFE1E2E4)
    val muted = Color(0xFFB2B2B2)
    val line = Color(0xFF393939)
    val gold = Color(0xFFC6A467)
    val ink = Color(0xFF202020)
    val notice = Color(0xFFE3CA98)
}

fun style(size: Int, color: Color, weight: FontWeight = FontWeight.Normal, spacing: Float = 0f, lineHeight: Int = 0) =
    TextStyle(fontSize = size.sp, color = color, fontWeight = weight, letterSpacing = spacing.sp, lineHeight = if (lineHeight > 0) lineHeight.sp else TextStyle.Default.lineHeight)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(SystemBarStyle.dark(Palette.panel.toArgb()), SystemBarStyle.dark(Palette.panel.toArgb()))
        Supabase.init(applicationContext)
        setContent { DalmiaApp() }
    }
}

enum class Tab { Discover, Saved, Account }

@Composable
fun DalmiaApp() {
    val context = LocalContext.current
    val focus = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    val store = remember { CatalogStore(context) }
    val saves = remember { SavedStore(context) }
    var tab by remember { mutableStateOf(Tab.Discover) }
    var query by remember { mutableStateOf("") }
    var category by remember { mutableStateOf("") }
    var searchOpen by remember { mutableStateOf(false) }
    var detail by remember { mutableStateOf<Product?>(null) }
    var toast by remember { mutableStateOf("") }

    val products = store.catalog.products
    val categories = remember(products) { products.map { it.category }.distinct() }
    val discovery = remember(products) { discoveryOrder(products) }
    val visible = remember(discovery, query, category, tab, saves.saved) { findProducts(discovery, query, category, if (tab == Tab.Saved) saves.saved else null) }
    val userId = Supabase.session?.userId

    LaunchedEffect(Unit) { while (true) { store.refresh(); delay(60_000) } }
    LaunchedEffect(Unit) { while (true) { delay(15_000); saves.sync() } }
    LaunchedEffect(userId) { saves.changeUser(userId); saves.sync() }
    LaunchedEffect(toast) { if (toast.isNotEmpty()) { delay(1900); toast = "" } }

    fun setSaved(product: Product, selected: Boolean) {
        saves.set(product.id, selected)
        scope.launch { saves.sync() }
    }
    fun toggle(product: Product) {
        val wasSaved = product.id in saves.saved
        setSaved(product, !wasSaved)
        toast = if (wasSaved) "${product.model} removed from saved" else "${product.model} saved to your collection"
    }
    fun reset() { query = ""; category = "" }

    Column(Modifier.fillMaxSize().background(Palette.panel).safeDrawingPadding().background(Palette.black)) {
        Row(Modifier.fillMaxWidth().height(64.dp).background(Palette.panel).padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(Modifier.semantics(mergeDescendants = true) { contentDescription = "Dalmia Hardware" }, horizontalArrangement = Arrangement.spacedBy(7.dp), verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.monogram), null, Modifier.size(32.dp))
                Image(painterResource(R.drawable.wordmark), null, Modifier.size(112.dp, 34.dp))
            }
            Spacer(Modifier.weight(1f))
            IconButton("search", if (searchOpen) Palette.gold else Color(0xFFEEEEEE), "Search models and filter categories", if (searchOpen) Color(0xFF2D2D2D) else Color.Transparent) { searchOpen = !searchOpen }
            IconButton("filter", if (category.isNotEmpty()) Palette.gold else Color(0xFFEEEEEE), "Filter products") { searchOpen = !searchOpen }
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(Color(0xFF303030)))
        if (searchOpen) {
            Column(Modifier.fillMaxWidth().background(Palette.panel).padding(start = 16.dp, end = 16.dp, top = 10.dp)) {
                Row(
                    Modifier.fillMaxWidth().height(42.dp).background(Color(0xFF2B2B2B), RoundedCornerShape(4.dp)).border(1.dp, Color(0xFF404040), RoundedCornerShape(4.dp)).padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Icon("search", 17, Color(0xFF999999))
                    Box(Modifier.weight(1f)) {
                        if (query.isEmpty()) Text("Model number, finish, or keyword", style = style(12, Color(0xFF8E8E8E)))
                        BasicTextField(
                            query, { query = it }, Modifier.fillMaxWidth().semantics { contentDescription = "Search model number or finish" },
                            textStyle = style(12, Color.White), singleLine = true, cursorBrush = SolidColor(Palette.gold),
                            keyboardOptions = KeyboardOptions(autoCorrectEnabled = false, imeAction = ImeAction.Search),
                            keyboardActions = KeyboardActions(onSearch = { focus.clearFocus(); searchOpen = false }),
                        )
                    }
                    if (query.isNotEmpty()) IconButton("close", Color.White, "Clear search", size = 18) { query = "" }
                }
                Row(Modifier.horizontalScroll(rememberScrollState()).padding(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    (listOf("") + categories).forEach { value ->
                        val selected = category == value
                        Text(
                            value.ifEmpty { "All products" },
                            Modifier.background(if (selected) Palette.gold else Color(0xFF2E2E2E), RoundedCornerShape(3.dp))
                                .clickable(role = Role.Button) { category = value }.semantics { this.selected = selected }.padding(horizontal = 12.dp, vertical = 8.dp),
                            style = style(10, if (selected) Palette.black else Color(0xFFCCCCCC), if (selected) FontWeight.SemiBold else FontWeight.Normal),
                        )
                    }
                }
            }
        }
        Box(Modifier.weight(1f)) {
            if (tab == Tab.Account) {
                AccountScreen()
            } else {
                Column {
                    Row(Modifier.fillMaxWidth().height(42.dp).padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically) {
                        Box(Modifier.size(16.dp, 1.dp).background(Palette.gold))
                        Text(if (tab == Tab.Saved) "YOUR SAVED COLLECTION" else "THE DALMIA COLLECTION", Modifier.padding(start = 8.dp).weight(1f), style = style(8, Color(0xFFBBBBBB), FontWeight.SemiBold, 1.9f))
                        Text("${visible.size} ${if (visible.size == 1) "product" else "products"}", Modifier.semantics { liveRegion = LiveRegionMode.Polite }, style = style(10, Color(0xFF8F8F8F)))
                    }
                    if (query.isNotEmpty() || category.isNotEmpty()) {
                        Row(Modifier.fillMaxWidth().height(30.dp).padding(horizontal = 20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Text(listOf(query, category).filter { it.isNotEmpty() }.joinToString(" · "), Modifier.weight(1f), style = style(10, Palette.gold), maxLines = 1, overflow = TextOverflow.Ellipsis)
                            LinkText("Clear filters", "Reset all filters") { reset() }
                        }
                    }
                    if (tab == Tab.Saved && saves.signedIn) {
                        LinkText("Add device saves to account", modifier = Modifier.padding(horizontal = 20.dp)) { saves.guestSaves().forEach { id -> saves.set(id, true) }; scope.launch { saves.sync() } }
                    }
                    if (saves.error.isNotEmpty()) Text(saves.error, Modifier.fillMaxWidth().background(Color(0xFF362B19)).padding(10.dp), style = style(10, Palette.notice, lineHeight = 15))
                    BoxWithConstraints(Modifier.weight(1f).fillMaxWidth()) {
                        val feedHeight = maxHeight
                        when {
                            !saves.ready -> EmptyState {
                                CircularProgressIndicator(color = Palette.gold)
                                Text("Opening your collection…", style = style(13, Color(0xFFAAAAAA)))
                            }
                            visible.isEmpty() -> EmptyState {
                                val welcome = tab == Tab.Saved && saves.saved.isEmpty()
                                Icon(if (tab == Tab.Saved) "heart" else "search", 48, Palette.gold)
                                Text(if (welcome) "Keep what you love." else "No matching products", style = style(26, Color.White, FontWeight.SemiBold), textAlign = TextAlign.Center)
                                Text(
                                    if (welcome) "Swipe right on a product to save it here. Sign in to sync your collection across devices." else "Try a different model number or clear the filters.",
                                    style = style(13, Color(0xFFAAAAAA), lineHeight = 22), textAlign = TextAlign.Center,
                                )
                                Row(
                                    Modifier.padding(top = 8.dp).background(Palette.gold, RoundedCornerShape(4.dp)).clickable(role = Role.Button) { reset(); tab = Tab.Discover }.padding(vertical = 13.dp, horizontal = 20.dp),
                                    verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    Text("Explore all products", style = style(12, Palette.black, FontWeight.Bold))
                                    Icon("next", 18, Palette.black)
                                }
                            }
                            else -> key(tab, query, category) {
                                val pager = rememberPagerState { visible.size }
                                VerticalPager(pager, Modifier.fillMaxSize().semantics { contentDescription = "Product discovery feed" }, beyondViewportPageCount = 1, key = { visible.getOrNull(it)?.id ?: it }) { page ->
                                    val product = visible.getOrNull(page) ?: return@VerticalPager
                                    ProductCard(
                                        product = product, height = feedHeight, index = page, count = visible.size,
                                        saved = product.id in saves.saved, active = pager.currentPage == page, savedView = tab == Tab.Saved,
                                        onSave = { setSaved(product, true); toast = "${product.model} saved to your collection" },
                                        onToggle = { toggle(product) },
                                        onNext = {
                                            val next = nextIndex(page, visible.size)
                                            focus.clearFocus()
                                            scope.launch { pager.scrollToPage(next) }
                                            if (next == 0 && visible.size > 1) toast = "Back to the first product"
                                        },
                                        onDetails = { detail = product },
                                    )
                                }
                            }
                        }
                        if (toast.isNotEmpty()) {
                            Row(
                                Modifier.padding(start = 28.dp, end = 28.dp, top = 43.dp).fillMaxWidth().background(Color(0xEE101010), RoundedCornerShape(5.dp))
                                    .border(1.dp, Color(0xFF6D5B37), RoundedCornerShape(5.dp)).padding(vertical = 12.dp, horizontal = 10.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Icon("check", 16, Palette.gold)
                                Text(toast, Modifier.semantics { liveRegion = LiveRegionMode.Polite }, style = style(11, Color(0xFFF0F0F0)))
                            }
                        }
                    }
                }
            }
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(Color(0xFF343434)))
        Row(Modifier.fillMaxWidth().height(58.dp).background(Palette.panel).padding(horizontal = 35.dp), verticalAlignment = Alignment.CenterVertically) {
            TabButton(tab == Tab.Discover, "Discover", "Discover products", "grid") { tab = Tab.Discover; searchOpen = false }
            Box(Modifier.padding(horizontal = 20.dp).size(1.dp, 20.dp).background(Color(0xFF333333)))
            TabButton(tab == Tab.Saved, "Saved", "Saved products, ${saves.saved.size} liked", "heart", badge = "${saves.saved.size}") { tab = Tab.Saved; searchOpen = false; reset() }
            TabButton(tab == Tab.Account, "Account", "Account", null) { tab = Tab.Account; searchOpen = false }
        }
    }

    detail?.let { product ->
        BackHandler { detail = null }
        ProductDetails(product, store.catalog, product.id in saves.saved, onClose = { detail = null }, onToggle = { toggle(product) })
    }
}

@Composable
fun IconButton(name: String, color: Color, label: String, background: Color = Color.Transparent, size: Int = 21, onClick: () -> Unit) {
    Box(
        Modifier.size(40.dp).background(background, RoundedCornerShape(4.dp)).clickable(role = Role.Button, onClick = onClick).semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) { Icon(name, size, color) }
}

@Composable
fun LinkText(text: String, label: String = text, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Text(text, modifier.clickable(role = Role.Button, onClick = onClick).semantics { contentDescription = label }, style = style(10, Color(0xFFBBBBBB)).copy(textDecoration = TextDecoration.Underline))
}

@Composable
private fun EmptyState(content: @Composable () -> Unit) {
    Column(Modifier.fillMaxSize().padding(horizontal = 38.dp), verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) { content() }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.TabButton(selected: Boolean, title: String, label: String, icon: String?, badge: String? = null, onClick: () -> Unit) {
    Box(Modifier.weight(1f).height(49.dp).clickable(role = Role.Tab, onClick = onClick).semantics { contentDescription = label; this.selected = selected }) {
        if (selected) Box(Modifier.fillMaxWidth().height(2.dp).background(Palette.gold))
        Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
            if (icon != null) Icon(icon, 21, if (selected) Palette.gold else Color(0xFF909090), filled = selected && icon == "heart")
            Text(title, style = style(11, if (selected) Color.White else Color(0xFF999999), if (selected) FontWeight.SemiBold else FontWeight.Normal))
            if (badge != null) {
                Box(Modifier.widthIn(min = 20.dp).heightIn(min = 19.dp).background(Color(0xFF313131), RoundedCornerShape(4.dp)).padding(horizontal = 5.dp), contentAlignment = Alignment.Center) {
                    Text(badge, style = style(9, Palette.gold, FontWeight.Bold))
                }
            }
        }
    }
}
