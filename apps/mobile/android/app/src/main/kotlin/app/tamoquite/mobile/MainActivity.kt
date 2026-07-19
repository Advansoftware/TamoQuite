package app.tamoquite.mobile

import io.flutter.embedding.android.FlutterFragmentActivity

// FlutterFragmentActivity (e não FlutterActivity) é obrigatório para o
// local_auth: o prompt biométrico do Android é um DialogFragment e precisa
// de uma FragmentActivity como host.
class MainActivity : FlutterFragmentActivity()
