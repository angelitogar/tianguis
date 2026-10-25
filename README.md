# Tianguis

Proyecto de comercio popular y barrial. La aplicación es una demostración web
estática; los cambios se guardan en el navegador y no se sincronizan entre
dispositivos.

## Ejecutar localmente

Los datos de prueba se cargan desde `data/tianguis.json`, por lo que la carpeta
debe servirse por HTTP en lugar de abrir directamente los archivos HTML:

```sh
python3 -m http.server 8000
```

Después, abre `http://localhost:8000`.

## Datos compartidos

`data/tianguis.json` es la fuente única para los datos iniciales. Contiene las
tablas `markets`, `users`, `businesses`, `products`, `denuncias` y `ratings`.
Los negocios, productos, cuentas y reportes se relacionan con identificadores
estables (`marketId`, `businessId` y `ownerUsername`). La lista de compras se
guarda como la tabla `cartItems` al usar la aplicación.

Al iniciar, `js/tianguis-negocios.js` carga ese archivo, importa los datos
existentes de las claves anteriores de `localStorage` y crea la base local
`tianguis_database_v1`; cuando la copia central se guarda correctamente, las
claves antiguas se retiran. Las páginas usan la misma API para consultar y actualizar
las tablas. Para añadir o cambiar ejemplos, edita el JSON y borra
`tianguis_database_v1` del almacenamiento local del navegador para inicializar
de nuevo con los datos del archivo. Haz una copia antes de borrarla si quieres
conservar datos ingresados desde la aplicación.

Las credenciales del archivo son únicamente para demostración local. Esta
aplicación no cuenta con backend ni autenticación segura; no debe usarse para
guardar datos personales o información real.
