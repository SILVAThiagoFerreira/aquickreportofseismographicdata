# DATA_SCHEMA.md

## Estrutura Normalizada

Cada PDF gera um registro em memória usado pela interface web e pelo gerador de PDF.

## `records[]`

Cada item representa um PDF processado.

Campos principais:

- `source_pdf`: nome do PDF enviado pelo usuário.
- `location`: nome da localização monitorada.
- `client`: cliente extraído do documento.
- `user_name`: nome operacional usado como cliente principal.
- `operation_name`: nome da operação/operador quando disponível.
- `serial_number`: número de série do equipamento.
- `battery_level`: nível de bateria.
- `unit_calibration`: calibração da unidade.
- `file_name`: nome do arquivo interno do equipamento.
- `scaled_distance`: distância escalada calculada.
- `distance_m`: distância em metros.
- `charge_kg`: carga em quilos.
- `raw_scaled_distance`: texto bruto da distância escalada.
- `event_date`: data do evento em ISO 8601.
- `pspl_db_l`: pressão sonora pico.
- `microphone_zc_freq_hz`: frequência do microfone.
- `peak_vector_sum_mm_s`: pico de vibração vetorial.
- `channels`: mapa por eixo (`Tran`, `Vert`, `Long`).
- `pspl_compliant`: conformidade do PSPL.

## `channels[axis]`

Campos por eixo:

- `axis`
- `ppv_mm_s`
- `zc_freq_hz`
- `event_time`
- `sensor_frequency_hz`
- `overswing_ratio`
- `reference_limit_mm_s`
- `compliant`

## Convenções

- Valores ausentes na apresentação podem aparecer como `N/D`.
- O modelo preserva `null` quando o dado não existir.
- `event_date` é mantido como string ISO.
- O fluxo web não exporta JSON por padrão; este esquema documenta a estrutura interna usada pelo relatório.
