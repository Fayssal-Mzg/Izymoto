// Ré-export : les règles de calcul vivent dans lib/pricing/ (source de vérité unique
// client + serveur, lot 0.3). Ne pas dupliquer de logique ici.
export {
  identifierZone,
  estimerPrix,
  calculerMajorations,
  estimerPrixTotal,
  calculerPrixCourse,
} from "@/lib/pricing/compute";
