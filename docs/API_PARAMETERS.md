# Image API parameters covered by the UI

## Generate endpoint

`POST /v1/images/generations`, JSON body:

- `model`
- `prompt`
- `background`
- `moderation`
- `n`
- `output_compression`
- `output_format`
- `partial_images`
- `quality`
- `response_format`
- `size`
- `stream`
- `style`
- `user`

## Edit endpoint

`POST /v1/images/edits`, multipart/form-data:

- `image` files
- `mask` file
- `model`
- `prompt`
- `background`
- `input_fidelity`
- `n`
- `output_compression`
- `output_format`
- `partial_images`
- `quality`
- `response_format`
- `size`
- `stream`
- `user`

## Future / provider-specific params

Любой параметр, которого нет в форме, можно добавить через `Raw JSON overrides`. Значения из raw JSON имеют приоритет над значениями формы.
