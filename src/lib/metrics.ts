export const METRICS = [
  { k: "weight_kg", l: "Peso", u: "kg" },
  { k: "waist_cm", l: "Cintura", u: "cm" },
  { k: "abdomen_cm", l: "Abdomen (ombligo)", u: "cm" },
  { k: "hip_cm", l: "Cadera", u: "cm" },
  { k: "glutes_cm", l: "Glúteos", u: "cm" },
  { k: "thigh_cm", l: "Muslo", u: "cm" },
  { k: "arm_cm", l: "Brazo", u: "cm" },
] as const;
export type MetricKey = (typeof METRICS)[number]["k"];
