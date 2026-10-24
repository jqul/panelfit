// Siembra en localStorage los datos de ejemplo (peso, dolor, perfil) que el modo demo lee desde ahí.
// Aparte de useAuthBootstrap para que los datos de ejemplo no viajen en el trozo de entrada.
import {
  DEMO_TRAINER_PROFILE, DEMO_TRAINER_ID,
  DEMO_WEIGHTS_MARIA, DEMO_WEIGHTS_CARLOS, DEMO_WEIGHTS_LAURA,
  DEMO_WEIGHTS_DIEGO, DEMO_WEIGHTS_MARTA, DEMO_WEIGHTS_BEATRIZ, DEMO_WEIGHTS_LUCAS,
  DEMO_DOLOR_MAP,
} from './demo-data'

export function hydrateDemoStorageSync() {
  localStorage.setItem(`pf_trainer_profile_${DEMO_TRAINER_ID}`, JSON.stringify(DEMO_TRAINER_PROFILE))
  localStorage.setItem(`pf_trainer_phone_${DEMO_TRAINER_ID}`, DEMO_TRAINER_PROFILE.phone)
  localStorage.setItem(`pf_weight_demo-client-001`, JSON.stringify(DEMO_WEIGHTS_MARIA))
  localStorage.setItem(`pf_weight_demo-client-002`, JSON.stringify(DEMO_WEIGHTS_CARLOS))
  localStorage.setItem(`pf_weight_demo-client-003`, JSON.stringify(DEMO_WEIGHTS_LAURA))
  localStorage.setItem(`pf_weight_demo-client-004`, JSON.stringify(DEMO_WEIGHTS_DIEGO))
  localStorage.setItem(`pf_weight_demo-client-005`, JSON.stringify(DEMO_WEIGHTS_MARTA))
  localStorage.setItem(`pf_weight_demo-client-006`, JSON.stringify(DEMO_WEIGHTS_BEATRIZ))
  localStorage.setItem(`pf_weight_demo-client-007`, JSON.stringify(DEMO_WEIGHTS_LUCAS))
  Object.entries(DEMO_DOLOR_MAP).forEach(([clientId, rows]) => {
    localStorage.setItem(`pf_dolor_${clientId}`, JSON.stringify(rows))
  })
}
