import type { Food, FoodState } from "../types";

// Valores por 100 g. Fuente principal: USDA FoodData Central (SR Legacy / FNDDS),
// redondeados. Son valores de REFERENCIA: varían por marca, variedad y preparación.
// Los platos preparados / comida fuera de casa son ESTIMACIONES por composición
// y se marcan como tales (estimated: true).
const USDA = "USDA FoodData Central (referencia, redondeado)";
const EST = "Estimación por composición — muy variable según preparación";
const LABEL = "Varía por marca — verifica la etiqueta y edítalo";

type Row = [id: string, name: string, cat: string, state: FoodState, kcal: number, p: number, c: number, f: number, fib: number, portion: string, pg: number, src?: string];

const rows: Row[] = [
  // Desayuno / batido
  ["avena", "Avena en hojuelas", "Cereales", "crudo", 379, 13.2, 67.7, 6.5, 10.1, "½ taza", 40],
  ["platano", "Plátano / banana", "Frutas", "crudo", 89, 1.1, 22.8, 0.3, 2.6, "1 mediano (sin cáscara)", 118],
  ["nueces", "Nueces", "Frutos secos", "crudo", 654, 15.2, 13.7, 65.2, 6.7, "1 puñado", 15],
  ["leche_entera", "Leche entera", "Lácteos", "listo", 61, 3.2, 4.8, 3.3, 0, "1 vaso", 240],
  ["leche_desc", "Leche descremada", "Lácteos", "listo", 34, 3.4, 5.0, 0.1, 0, "1 vaso", 240],
  ["frutilla", "Frutilla / fresa", "Frutas", "crudo", 32, 0.7, 7.7, 0.3, 2.0, "1 taza", 150],
  ["papaya", "Papaya", "Frutas", "crudo", 43, 0.5, 10.8, 0.3, 1.7, "1 taza", 145],
  ["manzana", "Manzana", "Frutas", "crudo", 52, 0.3, 13.8, 0.2, 2.4, "1 mediana", 180],
  ["mango", "Mango", "Frutas", "crudo", 60, 0.8, 15.0, 0.4, 1.6, "1 taza", 165],
  ["naranja", "Naranja", "Frutas", "crudo", 47, 0.9, 11.8, 0.1, 2.4, "1 mediana", 130],
  ["mandarina", "Mandarina", "Frutas", "crudo", 53, 0.8, 13.3, 0.3, 1.8, "1 unidad", 90],
  ["pina", "Piña", "Frutas", "crudo", 50, 0.5, 13.1, 0.1, 1.4, "1 taza", 165],
  ["uvas", "Uvas", "Frutas", "crudo", 69, 0.7, 18.1, 0.2, 0.9, "1 taza", 150],
  ["arandanos", "Arándanos", "Frutas", "crudo", 57, 0.7, 14.5, 0.3, 2.4, "1 taza", 148],
  ["chia", "Semillas de chía", "Semillas", "crudo", 486, 16.5, 42.1, 30.7, 34.4, "1 cda", 12],
  ["linaza", "Linaza molida", "Semillas", "crudo", 534, 18.3, 28.9, 42.2, 27.3, "1 cda", 10],
  ["miel", "Miel", "Endulzantes", "listo", 304, 0.3, 82.4, 0, 0.2, "1 cda", 21],
  ["azucar", "Azúcar", "Endulzantes", "listo", 387, 0, 100, 0, 0, "1 cdta", 4],
  ["whey", "Proteína whey en polvo", "Suplementos", "listo", 390, 78, 8, 5, 0, "1 scoop", 30, LABEL],
  ["yogur_griego", "Yogur griego natural descremado", "Lácteos", "listo", 59, 10.2, 3.6, 0.4, 0, "1 pote", 170],
  ["yogur_natural", "Yogur natural entero", "Lácteos", "listo", 61, 3.5, 4.7, 3.3, 0, "1 vaso", 200],
  ["queso_fresco", "Queso fresco (tipo criollo)", "Lácteos", "listo", 299, 18.1, 3.0, 23.8, 0, "1 tajada", 30],
  ["mani_crema", "Mantequilla de maní", "Frutos secos", "listo", 588, 25, 20, 50, 6, "1 cda", 16],
  ["mani", "Maní tostado", "Frutos secos", "listo", 585, 23.7, 21.5, 49.7, 8, "1 puñado", 28],
  ["almendras", "Almendras", "Frutos secos", "crudo", 579, 21.2, 21.6, 49.9, 12.5, "1 puñado", 28],
  // Proteínas
  ["huevo", "Huevo entero", "Proteínas", "crudo", 143, 12.6, 0.7, 9.5, 0, "1 unidad (sin cáscara)", 50],
  ["clara", "Clara de huevo", "Proteínas", "crudo", 52, 10.9, 0.7, 0.2, 0, "1 clara", 33],
  ["pollo_crudo", "Pechuga de pollo sin piel", "Proteínas", "crudo", 120, 22.5, 0, 2.6, 0, "1 filete", 150],
  ["pollo_cocido", "Pechuga de pollo a la plancha", "Proteínas", "cocido", 165, 31, 0, 3.6, 0, "1 filete", 120],
  ["res_magra_cruda", "Carne de res magra (lomo/pulpa)", "Proteínas", "crudo", 143, 21.5, 0, 6, 0, "1 bistec", 150],
  ["res_molida_cruda", "Carne molida de res 90% magra", "Proteínas", "crudo", 176, 20, 0, 10, 0, "porción", 120],
  ["res_molida_cocida", "Carne molida de res 90% magra, cocida", "Proteínas", "cocido", 217, 26.1, 0, 11.8, 0, "porción", 100],
  ["cerdo_lomo", "Lomo de cerdo magro", "Proteínas", "crudo", 143, 21.4, 0, 5.7, 0, "1 filete", 150],
  ["atun_agua", "Atún en agua (escurrido)", "Proteínas", "listo", 116, 25.5, 0, 0.8, 0, "1 lata escurrida", 120],
  ["sardina", "Sardina en aceite (escurrida)", "Proteínas", "listo", 208, 24.6, 0, 11.5, 0, "1 lata escurrida", 90],
  ["trucha", "Trucha", "Proteínas", "crudo", 141, 19.9, 0, 6.2, 0, "1 filete", 150],
  ["tilapia", "Pescado blanco (tilapia)", "Proteínas", "crudo", 96, 20.1, 0, 1.7, 0, "1 filete", 150],
  // Carbohidratos
  ["arroz_crudo", "Arroz blanco", "Cereales", "crudo", 365, 7.1, 80, 0.7, 1.3, "¼ taza", 50],
  ["arroz_cocido", "Arroz blanco cocido", "Cereales", "cocido", 130, 2.7, 28.2, 0.3, 0.4, "1 taza", 160],
  ["fideo_crudo", "Fideo / pasta seca", "Cereales", "crudo", 371, 13, 74.7, 1.5, 3.2, "porción", 70],
  ["fideo_cocido", "Fideo / pasta cocida", "Cereales", "cocido", 158, 5.8, 30.9, 0.9, 1.8, "1 taza", 140],
  ["quinua_cruda", "Quinua", "Cereales", "crudo", 368, 14.1, 64.2, 6.1, 7.0, "¼ taza", 45],
  ["quinua_cocida", "Quinua cocida", "Cereales", "cocido", 120, 4.4, 21.3, 1.9, 2.8, "1 taza", 185],
  ["papa_cruda", "Papa", "Tubérculos", "crudo", 77, 2.0, 17.5, 0.1, 2.2, "1 mediana", 170],
  ["papa_cocida", "Papa hervida (sin cáscara)", "Tubérculos", "cocido", 86, 1.7, 20, 0.1, 1.8, "1 mediana", 150],
  ["camote_cocido", "Camote / batata cocido", "Tubérculos", "cocido", 90, 2, 20.7, 0.2, 3.3, "1 mediano", 150],
  ["yuca_cruda", "Yuca", "Tubérculos", "crudo", 160, 1.4, 38.1, 0.3, 1.8, "1 trozo", 100],
  ["choclo_cocido", "Choclo / maíz dulce cocido", "Cereales", "cocido", 96, 3.4, 21, 1.5, 2.4, "1 mazorca (granos)", 100],
  ["platano_verde", "Plátano verde / macho cocido", "Tubérculos", "cocido", 116, 0.8, 31.2, 0.2, 2.3, "½ unidad", 100],
  ["pan_blanco", "Pan blanco (marraqueta / batido)", "Panes", "listo", 266, 7.6, 49, 3.3, 2.7, "1 unidad", 60],
  ["pan_integral", "Pan integral", "Panes", "listo", 252, 12.4, 42.7, 3.5, 6, "1 rebanada", 30],
  // Legumbres y verduras
  ["frejol_cocido", "Frejol / poroto negro cocido", "Legumbres", "cocido", 132, 8.9, 23.7, 0.5, 8.7, "½ taza", 90],
  ["lenteja_cocida", "Lenteja cocida", "Legumbres", "cocido", 116, 9, 20.1, 0.4, 7.9, "½ taza", 100],
  ["garbanzo_cocido", "Garbanzo cocido", "Legumbres", "cocido", 164, 8.9, 27.4, 2.6, 7.6, "½ taza", 82],
  ["brocoli", "Brócoli", "Verduras", "crudo", 34, 2.8, 6.6, 0.4, 2.6, "1 taza", 90],
  ["tomate", "Tomate", "Verduras", "crudo", 18, 0.9, 3.9, 0.2, 1.2, "1 mediano", 120],
  ["lechuga", "Lechuga", "Verduras", "crudo", 15, 1.4, 2.9, 0.2, 1.3, "1 taza", 50],
  ["zanahoria", "Zanahoria", "Verduras", "crudo", 41, 0.9, 9.6, 0.2, 2.8, "1 mediana", 60],
  ["cebolla", "Cebolla", "Verduras", "crudo", 40, 1.1, 9.3, 0.1, 1.7, "½ unidad", 55],
  ["palta", "Palta / aguacate", "Grasas", "crudo", 160, 2, 8.5, 14.7, 6.7, "¼ unidad", 50],
  ["aceite", "Aceite (vegetal u oliva)", "Grasas", "listo", 884, 0, 0, 100, 0, "1 cda", 13],
  // Snacks y comida fuera de casa
  ["chocolate_70", "Chocolate negro 70%", "Snacks", "listo", 598, 7.8, 45.9, 42.6, 10.9, "2 cuadritos", 20],
  ["papitas_chips", "Papitas fritas de paquete", "Snacks", "listo", 536, 7, 53, 35, 4.8, "1 bolsa pequeña", 45],
  ["gaseosa", "Gaseosa (con azúcar)", "Bebidas", "listo", 42, 0, 10.6, 0, 0, "1 vaso", 350],
  ["papas_fritas", "Papas fritas (restaurante)", "Fuera de casa", "listo", 312, 3.4, 41, 15, 3.8, "porción mediana", 150],
  ["salchicha", "Salchicha / hot dog", "Fuera de casa", "listo", 290, 10.3, 4.2, 26, 0, "1 unidad", 45],
  ["salchipapa", "Salchipapa (papa frita + salchicha, sin salsas)", "Fuera de casa", "listo", 305, 5.7, 28.7, 18.7, 2.5, "porción mediana", 300, EST],
  ["pollo_broaster", "Pollo frito apanado / broaster (con piel)", "Fuera de casa", "listo", 260, 24.8, 9, 13.2, 0.4, "1 presa", 150, EST],
  ["pizza_queso", "Pizza de queso", "Fuera de casa", "listo", 266, 11.4, 33, 10.4, 2.3, "1 porción", 110],
];

export const SEED_FOODS: Food[] = rows.map(([id, name, category, state, kcal, protein_g, carbs_g, fat_g, fiber_g, portion_name, portion_g, src]) => ({
  id: `f_${id}`, name, category, state, kcal, protein_g, carbs_g, fat_g, fiber_g, portion_name, portion_g,
  source: src ?? USDA, estimated: true, is_custom: false,
}));

// Sugerencias de comidas altas en proteína, fáciles y sin prohibiciones.
// Los macros NO se escriben a mano: se calculan con los alimentos de la base.
export interface MealIdea { title: string; slot: "desayuno" | "almuerzo" | "merienda" | "cena"; items: { food_id: string; grams: number }[]; tip: string }
export const MEAL_IDEAS: MealIdea[] = [
  { slot: "desayuno", title: "Batido + yogur griego", items: [{ food_id: "f_avena", grams: 40 }, { food_id: "f_platano", grams: 100 }, { food_id: "f_nueces", grams: 10 }, { food_id: "f_leche_desc", grams: 250 }, { food_id: "f_yogur_griego", grams: 150 }], tip: "Tu batido de siempre con un extra de proteína: añadir yogur griego al vaso o a un lado." },
  { slot: "desayuno", title: "Huevos revueltos con pan integral y palta", items: [{ food_id: "f_huevo", grams: 100 }, { food_id: "f_clara", grams: 66 }, { food_id: "f_pan_integral", grams: 60 }, { food_id: "f_palta", grams: 40 }], tip: "2 huevos + 2 claras: más proteína sin cambiar mucho el volumen." },
  { slot: "almuerzo", title: "Bistec, arroz, ensalada", items: [{ food_id: "f_res_magra_cruda", grams: 150 }, { food_id: "f_arroz_cocido", grams: 150 }, { food_id: "f_tomate", grams: 100 }, { food_id: "f_lechuga", grams: 50 }, { food_id: "f_aceite", grams: 7 }], tip: "Estilo silpancho casero: carne magra a la plancha y medio plato de ensalada." },
  { slot: "almuerzo", title: "Pollo con fideo y verduras salteadas", items: [{ food_id: "f_pollo_crudo", grams: 150 }, { food_id: "f_fideo_cocido", grams: 150 }, { food_id: "f_brocoli", grams: 100 }, { food_id: "f_zanahoria", grams: 60 }, { food_id: "f_aceite", grams: 7 }], tip: "Pesa el pollo en crudo para mayor precisión." },
  { slot: "almuerzo", title: "Trucha con quinua y choclo", items: [{ food_id: "f_trucha", grams: 150 }, { food_id: "f_quinua_cocida", grams: 150 }, { food_id: "f_choclo_cocido", grams: 80 }, { food_id: "f_tomate", grams: 80 }], tip: "Muy completo en proteína y fibra." },
  { slot: "merienda", title: "Yogur griego con fruta y chía", items: [{ food_id: "f_yogur_griego", grams: 170 }, { food_id: "f_frutilla", grams: 100 }, { food_id: "f_chia", grams: 10 }], tip: "Rápido y con ~20 g de proteína." },
  { slot: "merienda", title: "Sándwich de atún", items: [{ food_id: "f_pan_integral", grams: 60 }, { food_id: "f_atun_agua", grams: 100 }, { food_id: "f_tomate", grams: 50 }, { food_id: "f_palta", grams: 30 }], tip: "Ideal para llevar fuera de casa." },
  { slot: "merienda", title: "Papas al horno + huevo (antojo de salchipapa)", items: [{ food_id: "f_papa_cruda", grams: 200 }, { food_id: "f_aceite", grams: 7 }, { food_id: "f_huevo", grams: 100 }], tip: "Una versión casera para el antojo. Y si un día comes salchipapa, regístrala sin culpa: todo suma al plan." },
  { slot: "cena", title: "Omelette de verduras con queso", items: [{ food_id: "f_huevo", grams: 100 }, { food_id: "f_clara", grams: 99 }, { food_id: "f_queso_fresco", grams: 30 }, { food_id: "f_tomate", grams: 60 }, { food_id: "f_cebolla", grams: 30 }], tip: "Cena ligera y alta en proteína." },
  { slot: "cena", title: "Carne molida con papa y ensalada", items: [{ food_id: "f_res_molida_cruda", grams: 120 }, { food_id: "f_papa_cocida", grams: 150 }, { food_id: "f_lechuga", grams: 50 }, { food_id: "f_tomate", grams: 80 }], tip: "Clásico de casa, porción medida." },
  { slot: "cena", title: "Pollo con lentejas", items: [{ food_id: "f_pollo_crudo", grams: 120 }, { food_id: "f_lenteja_cocida", grams: 150 }, { food_id: "f_zanahoria", grams: 50 }], tip: "Proteína + fibra para mejor saciedad." },
];
