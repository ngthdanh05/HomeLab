// English text of each destination in culturalData.ts, keyed by destination id.
// Phrases are not listed here: they are the local language, shown as they are.
import type { CulturalDestination } from "./culturalData";

export type CulturalDestinationEn = Pick<
  CulturalDestination,
  "name" | "region" | "description" | "dos" | "donts" | "customs" | "localFood" | "bestTime" | "carbonTip"
>;

export const CULTURAL_EN: Record<string, CulturalDestinationEn> = {
  "hoi-an": {
    name: "Hoi An",
    region: "Central Vietnam",
    description:
      "Hoi An Ancient Town, a UNESCO World Heritage Site with historic architecture and traditional craft villages",
    dos: [
      "Dress modestly when entering pagodas and assembly halls",
      "Ask before photographing local people",
      "Shop at traditional handicraft stores",
      "Rent a bicycle to explore the old town in an eco-friendly way",
      "Try on an ao dai at the old town's tailor shops",
      "Join a lantern tour and release a floating lantern",
    ],
    donts: [
      "Don't take photos inside ancient houses without permission",
      "Don't wear short shorts or sleeveless tops into temples",
      "Don't leave lanterns in the river in the old town, as they pollute the water",
      "Don't bargain too low with artisans; respect their work",
      "Don't use plastic bags; support the zero-waste movement",
    ],
    customs: [
      "Monthly full-moon lantern festival on the 14th day of the lunar month",
      "Ancestor worship at family homes and assembly halls",
      "Traditional lantern making passed down through generations",
      "Releasing floating lanterns on the Hoai River to pray for peace",
    ],
    localFood: ["Cao lau noodles", "Mi Quang noodles", "Hoi An banh mi", "Chicken rice", "White rose dumplings (banh vac)"],
    bestTime: "February to April (dry season, little rain)",
    carbonTip: "Cycling through the old town cuts carbon by 95% compared with a motorbike",
  },
  "sa-pa": {
    name: "Sa Pa",
    region: "Northern Vietnam",
    description:
      "The misty town of Sa Pa, with majestic terraced rice fields and the cultures of the H'Mong and Red Dao ethnic minorities",
    dos: [
      "Buy handicrafts directly from H'Mong women",
      "Hire a local ethnic-minority guide",
      "Learn a few H'Mong phrases to show respect for the culture",
      "Dress warmly, as temperatures can drop below 10°C",
      "Stay in a village homestay to experience the culture",
      "Walk on marked trails",
    ],
    donts: [
      "Don't treat ethnic-minority vendors unfairly on price",
      "Don't enter people's homes without an invitation",
      "Don't photograph children and women without asking",
      "Don't litter on trekking routes",
      "Don't pick flowers or plants along the way",
      "Don't push artisans to accept very low prices",
    ],
    customs: [
      "The Sa Pa weekend market, where ethnic groups trade and meet",
      "Traditional H'Mong clothing with intricate hand embroidery",
      "Love-song singing at festivals",
      "Traditional linen weaving by H'Mong women",
      "H'Mong New Year (Nao Pe Chau) in December",
    ],
    localFood: ["Bamboo-tube rice (com lam)", "Thang co stew", "Sa Pa salmon", "Meo mustard greens", "Tao meo fruit wine"],
    bestTime: "March to May or September to November (fine weather, green or golden terraces)",
    carbonTip:
      "Taking the Hanoi to Lao Cai train instead of a motorbike cuts carbon by 60%. From Lao Cai, take an electric vehicle up to Sa Pa",
  },
  "phu-quoc": {
    name: "Phu Quoc",
    region: "Southern Vietnam",
    description: "Phu Quoc, the Pearl Island, with clear blue beaches and a rich tropical forest ecosystem",
    dos: [
      "Use sunscreen free of chemicals that harm coral",
      "Join an environmentally conscious diving tour",
      "Eat seafood at traditional fishing-family restaurants",
      "Explore Phu Quoc National Park with a guide",
      "Buy Phu Quoc fish sauce, one of Vietnam's top specialties",
      "Rent a bicycle or electric vehicle to explore the island",
    ],
    donts: [
      "Don't touch or stand on coral when diving",
      "Don't buy products made from wild animals",
      "Don't throw rubbish into the sea",
      "Don't bring sunscreen containing oxybenzone, which harms coral",
      "Don't fish in conservation areas",
      "Don't collect starfish or shells",
    ],
    customs: [
      "Traditional fish sauce making with a 100-year history on Phu Quoc",
      "Fishermen's festival praying for good catches and fair weather",
      "Releasing fish on the full moon of the seventh lunar month",
      "Traditional pearl harvesting and jewellery making",
    ],
    localFood: ["Phu Quoc fish sauce", "Herring salad", "Grilled sea urchin", "Phu Quoc crab", "Bun quay noodles"],
    bestTime: "November to April (dry season, calmer seas)",
    carbonTip:
      "Renting an electric bicycle instead of a motorbike removes all local emissions. Use paper straws and say no to single-use plastic",
  },
};
