/*
 * Datos de demostración para probar la lista y el mapa.
 *
 * Los horarios, precios, nombres y ubicaciones no son datos verificados.
 * "disponible" significa que el ejemplo reporta una oferta; no garantiza
 * existencias ni que el puesto pueda cubrir la cantidad solicitada.
 *
 * Para conectar un backend después, conserva una estructura equivalente:
 * tianguis → puestos → productos.
 */

window.TIANGUIS_DEMO = [
    {
        id: "tianguis-parque",
        nombre: "Tianguis del Parque (demo)",
        horario: "Ejemplo: domingos, de 8:00 a 15:00",
        referencia: "Punto A del esquema; ubicación ficticia",
        x: 28,
        y: 37,
        puestos: [
            {
                nombre: "Verduras de Ana (demo)",
                categoria: "comida",
                productos: [
                    {
                        nombre: "jitomate",
                        alias: ["tomate rojo"],
                        unidad: "kg",
                        precio: 28,
                        disponibilidad: "disponible"
                    },
                    {
                        nombre: "cebolla",
                        alias: [],
                        unidad: "kg",
                        precio: 24,
                        disponibilidad: "disponible"
                    },
                    {
                        nombre: "limón",
                        alias: ["limones"],
                        unidad: "kg",
                        precio: 35,
                        disponibilidad: "agotado"
                    }
                ]
            },
            {
                nombre: "Abarrotes del Parque (demo)",
                categoria: "comida",
                productos: [
                    {
                        nombre: "arroz",
                        alias: [],
                        unidad: "kg",
                        precio: 32,
                        disponibilidad: "disponible"
                    },
                    {
                        nombre: "huevo",
                        alias: ["huevos"],
                        unidad: "kg",
                        precio: 48,
                        disponibilidad: "sin confirmar"
                    }
                ]
            }
        ]
    },
    {
        id: "tianguis-plaza",
        nombre: "Tianguis de la Plaza (demo)",
        horario: "Ejemplo: martes y sábados, de 9:00 a 16:00",
        referencia: "Punto B del esquema; ubicación ficticia",
        x: 58,
        y: 52,
        puestos: [
            {
                nombre: "Frutas y verduras Leo (demo)",
                categoria: "comida",
                productos: [
                    {
                        nombre: "jitomate",
                        alias: ["tomate rojo"],
                        unidad: "kg",
                        precio: 30,
                        disponibilidad: "disponible"
                    },
                    {
                        nombre: "limón",
                        alias: ["limones"],
                        unidad: "kg",
                        precio: 32,
                        disponibilidad: "disponible"
                    },
                    {
                        nombre: "aguacate",
                        alias: [],
                        unidad: "kg",
                        precio: 70,
                        disponibilidad: "disponible"
                    }
                ]
            },
            {
                nombre: "Ropa de barrio (demo)",
                categoria: "ropa",
                productos: [
                    {
                        nombre: "playera",
                        alias: ["camiseta"],
                        unidad: "pieza",
                        precio: 90,
                        disponibilidad: "disponible"
                    }
                ]
            }
        ]
    },
    {
        id: "tianguis-colonia",
        nombre: "Tianguis de la Colonia (demo)",
        horario: "Ejemplo: miércoles, de 8:00 a 14:00",
        referencia: "Punto C del esquema; ubicación ficticia",
        x: 72,
        y: 30,
        puestos: [
            {
                nombre: "Despensa Elena (demo)",
                categoria: "comida",
                productos: [
                    {
                        nombre: "arroz",
                        alias: [],
                        unidad: "kg",
                        precio: 29,
                        disponibilidad: "disponible"
                    },
                    {
                        nombre: "huevo",
                        alias: ["huevos"],
                        unidad: "kg",
                        precio: 46,
                        disponibilidad: "disponible"
                    },
                    {
                        nombre: "cebolla",
                        alias: [],
                        unidad: "kg",
                        precio: 25,
                        disponibilidad: "disponible"
                    }
                ]
            },
            {
                nombre: "Limpieza del hogar (demo)",
                categoria: "hogar",
                productos: [
                    {
                        nombre: "jabón",
                        alias: ["jabon de barra"],
                        unidad: "pieza",
                        precio: 18,
                        disponibilidad: "disponible"
                    }
                ]
            }
        ]
    }
];
