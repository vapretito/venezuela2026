export type HospitalGallery = {
  slug: string;
  name: string;
  images: string[];
};

export const hospitalGalleries: HospitalGallery[] = [
  {
    slug: "perez-carreno",
    name: "Hospital Perez Carreno",
    images: ["/hospital-galleries/perez-carreno/perez-carreno-1.jpeg"],
  },
  {
    slug: "vargas-caracas",
    name: "Hospital Vargas Caracas",
    images: [
      "/hospital-galleries/vargas-caracas/vargas-caracas-1.jpeg",
      "/hospital-galleries/vargas-caracas/vargas-caracas-2.jpeg",
    ],
  },
  {
    slug: "luciani-caracas",
    name: "Hospital Luciani Caracas",
    images: [
      "/hospital-galleries/luciani-caracas/luciani-caracas-1.jpeg",
      "/hospital-galleries/luciani-caracas/luciani-caracas-2.jpeg",
      "/hospital-galleries/luciani-caracas/luciani-caracas-3.jpeg",
      "/hospital-galleries/luciani-caracas/luciani-caracas-4.jpeg",
    ],
  },
  {
    slug: "campo-golf-playa-los-cocos",
    name: "Campo de golf Playa Los Cocos",
    images: [
      "/hospital-galleries/campo-golf-playa-los-cocos/IMG-20260626-WA0003.jpg",
      "/hospital-galleries/campo-golf-playa-los-cocos/IMG-20260626-WA0004.jpg",
      "/hospital-galleries/campo-golf-playa-los-cocos/IMG-20260626-WA0005.jpg",
      "/hospital-galleries/campo-golf-playa-los-cocos/IMG-20260626-WA0009.jpg",
    ],
  },
];
