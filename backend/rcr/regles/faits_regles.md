# RCR - Faits et règles (logique classique)

Statut : BROUILLON à valider avant d'écrire le code.

## 1. Spécialités
- IA : Intelligence Artificielle
- GL : Génie Logiciel
- CYS : Cybersécurité

## 2. Faits de base (pour un étudiant e)
- note_algo(e) : note d'Algorithmique, entre 0 et 20 (saisie par le professeur, peut être absente)
- note_prog(e) : note de Programmation, entre 0 et 20 (peut être absente)
- note_math(e) : note de Mathématiques, entre 0 et 20 (peut être absente)
- interet_IA(e), interet_GL(e), interet_CYS(e) : vrai si la spécialité est cochée dans les centres d'intérêt

Règle générale : une règle ne s'applique que si toutes les notes qu'elle utilise sont connues. Sinon, rien n'est conclu.

## 3. Seuil et moyennes
- Seuil d'accès S = 10/20 (validé).
- Moyenne d'une spécialité = moyenne des modules qui lui sont liés (proposition à confirmer) :
  - Moy_IA(e) = (note_algo + note_math) / 2
  - Moy_GL(e) = note_prog
  - Moy_CYS(e) = (note_algo + note_prog) / 2

## 4. Règles de déduction (en texte)
- R1 : si Moy_IA(e) ≥ 10, alors e est accessible à IA.
- R2 : si Moy_GL(e) ≥ 10, alors e est accessible à GL.
- R3 : si Moy_CYS(e) ≥ 10, alors e est accessible à CYS.
- R4 : si e est accessible à une spécialité S et que interet_S(e) est vrai, alors S est recommandée pour e (proposition à confirmer).

## 5. Forme propositionnelle (pour les tests)
Atomes :
- P_IA = "Moy_IA ≥ 10", P_GL = "Moy_GL ≥ 10", P_CYS = "Moy_CYS ≥ 10"
- I_IA, I_GL, I_CYS = intérêt pour chaque spécialité
- Acc_IA, Acc_GL, Acc_CYS = accessible
- Rec_IA, Rec_GL, Rec_CYS = recommandée

Clauses :
- P_IA → Acc_IA
- P_GL → Acc_GL
- P_CYS → Acc_CYS
- Acc_IA ∧ I_IA → Rec_IA
- Acc_GL ∧ I_GL → Rec_GL
- Acc_CYS ∧ I_CYS → Rec_CYS

## 6. Cas sans conclusion
Si une note nécessaire manque, P_S n'est pas établi. La spécialité n'est alors ni accessible ni recommandée, et le résultat affiche "données insuffisantes" (ce n'est pas un refus). Ce point servira à la comparaison avec le raisonnement par défaut.

## 7. Points à valider
1. La moyenne d'une spécialité = moyenne des modules liés (IA : Algo + Math, GL : Prog, CYS : Algo + Prog).
2. Recommandée = accessible ET intérêt coché.
