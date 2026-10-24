package com.dalmiahardware.catalog

import android.provider.Settings
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.util.VelocityTracker
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import kotlin.math.max

@Composable
fun ProductCard(
    product: Product, height: Dp, index: Int, count: Int, saved: Boolean, active: Boolean, savedView: Boolean,
    onSave: () -> Unit, onToggle: () -> Unit, onNext: () -> Unit, onDetails: () -> Unit,
) {
    val context = LocalContext.current
    val density = LocalDensity.current.density
    val haptics = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()
    val offset = remember { Animatable(0f) }
    var busy by remember { mutableStateOf(false) }
    val save by rememberUpdatedState(onSave)
    val next by rememberUpdatedState(onNext)
    val screenWidth = LocalConfiguration.current.screenWidthDp
    val reduceMotion = remember { Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f }
    val short = height < 620.dp
    val tiny = height < 520.dp

    fun perform(action: SwipeAction) {
        if (busy) return
        busy = true
        haptics.performHapticFeedback(if (action == SwipeAction.Save) HapticFeedbackType.LongPress else HapticFeedbackType.TextHandleMove)
        scope.launch {
            offset.animateTo((if (action == SwipeAction.Save) 1 else -1) * max(screenWidth, 450) * density, tween(if (reduceMotion) 0 else 190))
            if (action == SwipeAction.Save) save()
            next()
            offset.snapTo(0f)
            busy = false
        }
    }

    LaunchedEffect(active) { if (!active) { offset.snapTo(0f); busy = false } }

    val dx = offset.value / density
    Column(Modifier.fillMaxSize().padding(start = 14.dp, end = 14.dp, bottom = 10.dp)) {
        Column(
            Modifier.weight(1f)
                .pointerInput(Unit) {
                    val tracker = VelocityTracker()
                    detectHorizontalDragGestures(
                        onDragStart = { tracker.resetTracking() },
                        onHorizontalDrag = { change, amount ->
                            tracker.addPosition(change.uptimeMillis, change.position)
                            if (!busy) scope.launch { offset.snapTo(offset.value + amount) }
                        },
                        onDragEnd = {
                            if (!busy) {
                                val action = swipeAction(offset.value / density, 0f, tracker.calculateVelocity().x / density)
                                if (action != null) perform(action) else scope.launch { offset.animateTo(0f, spring(dampingRatio = 0.7f)) }
                            }
                        },
                        onDragCancel = { scope.launch { offset.animateTo(0f) } },
                    )
                }
                .graphicsLayer { translationX = offset.value; rotationZ = (offset.value / density / 300f * 8f).coerceIn(-8f, 8f) }
                .clip(RoundedCornerShape(6.dp)).background(Palette.charcoal).border(1.dp, Color(0xFF373737), RoundedCornerShape(6.dp)),
        ) {
            Row(Modifier.fillMaxWidth().height(36.dp).background(Palette.ink).padding(horizontal = 15.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(product.category.uppercase(), Modifier.weight(1f), style = style(9, Palette.gold, FontWeight.Bold, 1.7f))
                Text(buildAnnotatedString {
                    append("%02d ".format(index + 1))
                    withStyle(SpanStyle(color = Color(0xFF8B8B8B))) { append("/ $count") }
                }, style = style(11, Color.White, FontWeight.SemiBold).copy(fontFeatureSettings = "tnum"))
            }
            Box(Modifier.weight(1f).heightIn(min = if (tiny) 100.dp else 150.dp).fillMaxWidth().background(Palette.silver)) {
                CatalogImage(product, Modifier.fillMaxSize())
                Text(
                    "DALMIA / ORIGINAL CATALOGUE", Modifier.align(Alignment.BottomStart).padding(start = 12.dp, bottom = 10.dp)
                        .background(Color(0xCCFFFFFF), RoundedCornerShape(2.dp)).padding(horizontal = 7.dp, vertical = 4.dp),
                    style = style(7, Color(0xFF555555), FontWeight.SemiBold, 1.2f),
                )
                Box(
                    Modifier.align(Alignment.BottomEnd).padding(10.dp).size(38.dp).background(Color(0xEBFFFFFF), CircleShape)
                        .clickable(role = Role.Button, onClick = onDetails).semantics { contentDescription = "View details for ${product.model}" },
                    contentAlignment = Alignment.Center,
                ) { Icon("info", 22, Palette.ink) }
                if (saved) {
                    Row(
                        Modifier.align(Alignment.TopEnd).padding(12.dp).background(Palette.gold, RoundedCornerShape(3.dp)).padding(horizontal = 9.dp, vertical = 6.dp),
                        horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon("heart", 12, Palette.black, filled = true)
                        Text("SAVED", style = style(8, Palette.black, FontWeight.ExtraBold, 1f))
                    }
                }
                Stamp("SAVED", Palette.gold, -12f, ramp(dx), Modifier.align(Alignment.TopStart).padding(start = 25.dp, top = 35.dp))
                Stamp("NEXT", Color.White, 12f, ramp(-dx), Modifier.align(Alignment.TopEnd).padding(end = 25.dp, top = 35.dp))
            }
            Column(Modifier.fillMaxWidth().background(Palette.ink).padding(start = 17.dp, end = 17.dp, top = if (short) 13.dp else 20.dp, bottom = if (short) 10.dp else 16.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Column(Modifier.weight(1f)) {
                        Text("MODEL", Modifier.padding(bottom = 3.dp), style = style(8, Color(0xFF929292), FontWeight.SemiBold, 2f))
                        Text(
                            product.model, maxLines = if (product.model.length > 20) 2 else 1, overflow = TextOverflow.Ellipsis,
                            style = style(if (product.model.length > 16) 21 else if (short) 32 else 38, Color.White, spacing = -0.5f).copy(fontFamily = FontFamily.Serif),
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        Text(if (product.minPrice == null) "Listed price" else "Starting at", Modifier.padding(bottom = 5.dp), style = style(9, Palette.muted))
                        Text(if (product.minPrice == null) "Not listed" else priceAmount(product.minPrice), style = style(18, Color.White, FontWeight.SemiBold).copy(fontFeatureSettings = "tnum"))
                        if (product.perInch) Text("per inch", Modifier.padding(top = 3.dp), style = style(9, Palette.gold))
                    }
                }
                Text(
                    product.sizes.ifEmpty { listOf("See catalogue details") }.joinToString(" · ") +
                        if (product.variants.isEmpty()) "" else "  /  ${product.variants.size} price ${if (product.variants.size == 1) "row" else "rows"}",
                    Modifier.padding(top = 7.dp, bottom = 12.dp), maxLines = 1, overflow = TextOverflow.Ellipsis, style = style(10, Color(0xFFB7B7B7)),
                )
                if (!tiny) {
                    val prices = calculatedPrices(product.minPrice)
                    val unit = if (product.perInch) " / INCH" else ""
                    Box(Modifier.fillMaxWidth().height(1.dp).background(Color(0xFF3B3B3B)))
                    Row(Modifier.padding(top = 12.dp, bottom = 13.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(13.dp)) {
                        QuickPrice("65% OFF$unit", prices[0])
                        Box(Modifier.size(1.dp, 26.dp).background(Color(0xFF3B3B3B)))
                        QuickPrice("75% OFF$unit", prices[1])
                        Spacer(Modifier.weight(1f))
                        Row(
                            Modifier.clickable(role = Role.Button, onClick = onDetails).semantics(mergeDescendants = true) { contentDescription = "All prices for ${product.model}" }.padding(vertical = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text("All prices", style = style(11, Palette.gold))
                            Icon("next", 16, Palette.gold)
                        }
                    }
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(13.dp)) {
                    Row(
                        Modifier.weight(1f).height(43.dp).background(Color(0xFF292929), RoundedCornerShape(4.dp)).border(1.dp, Color(0xFF4A4A4A), RoundedCornerShape(4.dp))
                            .clickable(role = Role.Button) { perform(SwipeAction.Next) }.semantics(mergeDescendants = true) { contentDescription = "Next product after ${product.model}" },
                        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon("next", 20)
                        Text("Next", style = style(12, Color(0xFFEEEEEE), FontWeight.SemiBold))
                    }
                    Box(
                        Modifier.size(47.dp).background(if (saved) Palette.gold else Color.Transparent, CircleShape).border(1.dp, Palette.gold, CircleShape)
                            .clickable(role = Role.Button, onClick = onToggle)
                            .semantics { contentDescription = if (saved) "Unlike model ${product.model}" else "Like model ${product.model}"; selected = saved },
                        contentAlignment = Alignment.Center,
                    ) { Icon("heart", 26, if (saved) Palette.black else Palette.gold, filled = saved) }
                    Row(
                        Modifier.weight(1f).height(43.dp).background(Palette.gold, RoundedCornerShape(4.dp))
                            .clickable(role = Role.Button) { perform(SwipeAction.Save) }.semantics(mergeDescendants = true) { contentDescription = "Save model ${product.model} and continue" },
                        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Save", style = style(12, Palette.black, FontWeight.Bold))
                        Icon("heart", 18, Palette.black)
                    }
                }
                Text(
                    if (savedView) "Your saved collection. Tap the heart to unlike." else "Swipe right to save · Left for next · Scroll to explore",
                    Modifier.fillMaxWidth().padding(top = 12.dp), style = style(8, Color(0xFF9C9C9C), spacing = 0.1f).copy(textAlign = androidx.compose.ui.text.style.TextAlign.Center),
                )
            }
        }
    }
}

// Maps 0 → 35 → 100 dp of drag onto 0 → 0.4 → 1 opacity.
private fun ramp(value: Float) = when {
    value <= 0 -> 0f
    value < 35 -> 0.4f * value / 35
    value < 100 -> 0.4f + 0.6f * (value - 35) / 65
    else -> 1f
}

@Composable
private fun Stamp(title: String, color: Color, angle: Float, alpha: Float, modifier: Modifier) {
    Row(
        modifier.graphicsLayer { rotationZ = angle; this.alpha = alpha }.background(Color(0xE8151515), RoundedCornerShape(6.dp))
            .border(3.dp, color, RoundedCornerShape(6.dp)).padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically,
    ) {
        if (title == "SAVED") Icon("heart", 26, color, filled = true)
        Text(title, style = style(30, color, FontWeight.Black))
        if (title == "NEXT") Icon("next", 26, color)
    }
}

@Composable
private fun QuickPrice(label: String, value: Double?) {
    Column(Modifier.widthIn(min = 66.dp)) {
        Text(label, Modifier.padding(bottom = 4.dp), style = style(7, Color(0xFFB3B3B3), spacing = 0.8f))
        Text(priceAmount(value), style = style(14, Color.White, FontWeight.SemiBold).copy(fontFeatureSettings = "tnum"))
    }
}

@Composable
fun CatalogImage(product: Product, modifier: Modifier = Modifier) {
    val url = product.image?.let { catalogMediaUrl(it, BuildConfig.SUPABASE_URL) }
    var failed by remember(url) { mutableStateOf(false) }
    if (url == null || failed) {
        Column(modifier, verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon("image", 38, Color(0xFF747474))
            Text("No catalogue picture", style = style(15, Color(0xFF555555), FontWeight.SemiBold))
            Text("Model ${product.model}", style = style(11, Color(0xFF777777)))
        }
    } else {
        AsyncImage(url, "${product.category} model ${product.model}", modifier, contentScale = ContentScale.Fit, onError = { failed = true })
    }
}
