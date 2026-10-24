import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

fun properties(name: String) = Properties().apply { rootProject.file(name).takeIf { it.exists() }?.inputStream()?.use(::load) }
val local = properties("local.properties")
val signing = properties("keystore.properties")

android {
    namespace = "com.dalmiahardware.catalog"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.dalmiahardware.catalog"
        minSdk = 26
        targetSdk = 36
        versionCode = 3
        versionName = "2.0.0"
        buildConfigField("String", "SUPABASE_URL", "\"${local.getProperty("supabase.url", "").trimEnd('/')}\"")
        buildConfigField("String", "SUPABASE_PUBLISHABLE_KEY", "\"${local.getProperty("supabase.publishableKey", "")}\"")
    }

    // Release signing is optional; keystore.properties holds storeFile, storePassword, keyAlias, keyPassword.
    if (signing.isNotEmpty()) {
        signingConfigs.create("release") {
            storeFile = rootProject.file(signing.getProperty("storeFile"))
            storePassword = signing.getProperty("storePassword")
            keyAlias = signing.getProperty("keyAlias")
            keyPassword = signing.getProperty("keyPassword")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            if (signing.isNotEmpty()) signingConfig = signingConfigs.getByName("release")
        }
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
}
