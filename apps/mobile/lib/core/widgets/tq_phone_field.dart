import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/app_brand_colors.dart';
import '../utils/phone.dart';

/// Campo de WhatsApp com seletor de país, equivalente ao `PhoneInput` do site.
///
/// O valor exposto por [onChanged] são os dígitos internacionais completos
/// (`5511999999999`), que é exatamente o que a API grava.
class TqPhoneField extends StatefulWidget {
  const TqPhoneField({
    required this.label,
    required this.initialValue,
    required this.onChanged,
    this.enabled = true,
    super.key,
  });

  final String label;

  /// Valor já armazenado (dígitos internacionais), ou vazio ao cadastrar.
  final String initialValue;

  final ValueChanged<String> onChanged;
  final bool enabled;

  @override
  State<TqPhoneField> createState() => _TqPhoneFieldState();
}

class _TqPhoneFieldState extends State<TqPhoneField> {
  late PhoneCountry _country;
  late final TextEditingController _controller;

  @override
  void initState() {
    super.initState();
    final parsed = PhoneNumber.parse(widget.initialValue);
    _country = parsed.country;
    _controller = TextEditingController(text: _country.format(parsed.national));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Os dígitos nacionais realmente digitados, sem a máscara.
  String get _national => onlyDigits(_controller.text);

  void _emit() =>
      widget.onChanged(PhoneNumber(country: _country, national: _national).e164Digits);

  void _onCountryChanged(PhoneCountry country) {
    setState(() {
      _country = country;
      // Reaplica a máscara do novo país sobre os dígitos já digitados.
      _controller.text = country.format(_national);
    });
    _emit();
  }

  void _onTextChanged(String _) {
    final formatted = _country.format(_national);
    if (formatted != _controller.text) {
      _controller.value = TextEditingValue(
        text: formatted,
        // O cursor vai para o fim: a máscara é reescrita inteira a cada
        // tecla, então preservar o offset antigo o deixaria no lugar errado.
        selection: TextSelection.collapsed(offset: formatted.length),
      );
    }
    _emit();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(widget.label, style: theme.textTheme.titleSmall),
        const SizedBox(height: 8),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _CountryPicker(
              country: _country,
              enabled: widget.enabled,
              onChanged: _onCountryChanged,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: TextField(
                controller: _controller,
                enabled: widget.enabled,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                onChanged: _onTextChanged,
                inputFormatters: [
                  FilteringTextInputFormatter.deny(RegExp(r'[^\d\s()\-]')),
                ],
                style: theme.textTheme.bodyMedium,
                decoration: InputDecoration(hintText: _country.placeholder),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _CountryPicker extends StatelessWidget {
  const _CountryPicker({
    required this.country,
    required this.enabled,
    required this.onChanged,
  });

  final PhoneCountry country;
  final bool enabled;
  final ValueChanged<PhoneCountry> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return PopupMenuButton<PhoneCountry>(
      enabled: enabled,
      tooltip: 'País',
      initialValue: country,
      onSelected: onChanged,
      itemBuilder: (context) => [
        for (final option in kPhoneCountries)
          PopupMenuItem(
            value: option,
            child: Text('${option.flag}  ${option.name}  +${option.dial}'),
          ),
      ],
      child: Container(
        height: 48,
        padding: const EdgeInsets.symmetric(horizontal: 12),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: theme.colorScheme.outline),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(country.flag, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 4),
            Icon(
              Icons.arrow_drop_down,
              size: 18,
              color: theme.brand.mutedForeground,
            ),
          ],
        ),
      ),
    );
  }
}
