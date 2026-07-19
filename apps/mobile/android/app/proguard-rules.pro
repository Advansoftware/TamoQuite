# Flutter engine
-keep class io.flutter.app.** { *; }
-keep class io.flutter.plugin.** { *; }
-keep class io.flutter.util.** { *; }
-keep class io.flutter.view.** { *; }
-keep class io.flutter.** { *; }
-keep class io.flutter.plugins.** { *; }

# O engine referencia o Play Core para deferred components (split install),
# recurso que este app não usa. As classes não estão no classpath, e sem esta
# regra o R8 falha por referência ausente.
-dontwarn com.google.android.play.core.**

# local_auth apoia-se na AndroidX Biometric, que resolve classes por reflexão.
-keep class androidx.biometric.** { *; }
