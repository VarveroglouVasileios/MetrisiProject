<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { EXTRAS, LEVELS, SPACES, clampArea, estimate, formatNum, range, summary, validateRequest, type Answers, type Errors, type Extra, type Level, type Space } from '@/lib/estimate'
import { load, save } from '@/lib/storage'

const a = reactive<Answers>({ space: 'bathroom', area: 6, level: 'mid', extras: ['heating'] })
const areaText = ref('6')
const space = computed(() => SPACES[a.space])
const e = computed(() => estimate(a))
const parts = computed(() => [
  { k: 'Υλικά', v: e.value.materials },
  { k: 'Εργασία', v: e.value.labour },
  { k: 'Έξτρα', v: e.value.extras },
])

const setSpace = (s: Space): void => {
  a.space = s
  a.area = SPACES[s].presets[1]
  areaText.value = String(a.area)
}
const setArea = (n: number): void => {
  a.area = clampArea(a.space, n)
  areaText.value = String(a.area)
}
const onAreaInput = (): void => {
  const n = Number(areaText.value)
  if (Number.isFinite(n) && n > 0) a.area = clampArea(a.space, n)
}
const toggleExtra = (x: Extra): void => {
  a.extras = a.extras.includes(x) ? a.extras.filter((y) => y !== x) : [...a.extras, x]
}

// --- visit request ----------------------------------------------------------
const open = ref(false)
const form = reactive({ name: '', phone: '', when: '' })
const errors = ref<Errors>({})
const sent = ref('')
const KEY = 'metrisi.request.v1'
const submit = (): void => {
  errors.value = validateRequest(form)
  if (Object.keys(errors.value).length) return
  const ref_ = `ΜΤ-${String(load<unknown[]>(KEY, []).length + 1).padStart(4, '0')}`
  save(KEY, [...load<unknown[]>(KEY, []), { ref: ref_, name: form.name.trim(), when: form.when, summary: summary(a), range: range(e.value) }])
  sent.value = ref_
}
const whens = [['morning', 'Πρωί'], ['noon', 'Μεσημέρι'], ['evening', 'Απόγευμα']] as const
</script>

<template>
  <main class="wrap main">
    <section class="intro">
      <h1>Πόσο κάνει <em>η ανακαίνιση;</em></h1>
      <p class="lead">Απαντήστε σε τέσσερις ερωτήσεις και δείτε μια ενδεικτική εκτίμηση αμέσως. Μετά την επίσκεψη στον χώρο θα πάρετε πραγματική προσφορά.</p>
    </section>

    <div class="grid">
      <form class="steps" novalidate @submit.prevent>
        <fieldset class="step">
          <legend><b>01</b> Ποιος χώρος;</legend>
          <div class="chips">
            <label v-for="(s, id) in SPACES" :key="id"><input type="radio" name="space" :checked="a.space === id" @change="setSpace(id as Space)" /><span>{{ s.label }}</span></label>
          </div>
        </fieldset>

        <fieldset class="step">
          <legend><b>02</b> Πόσα τετραγωνικά;</legend>
          <div class="area">
            <input v-model="areaText" class="area-in" inputmode="numeric" aria-label="Τετραγωνικά" @input="onAreaInput" @blur="setArea(a.area)" /><span>m²</span>
            <button v-for="p in space.presets" :key="p" type="button" class="chip" :class="{ on: a.area === p }" @click="setArea(p)">{{ p }} m²</button>
          </div>
          <input type="range" class="range" :min="space.min" :max="space.max" :value="a.area" :aria-label="`Τετραγωνικά, από ${space.min} έως ${space.max}`" @input="setArea(Number(($event.target as HTMLInputElement).value))" />
          <p class="hint">{{ space.min }} – {{ space.max }} m² για {{ space.label.toLowerCase() }}</p>
        </fieldset>

        <fieldset class="step">
          <legend><b>03</b> Επίπεδο υλικών</legend>
          <div class="chips">
            <label v-for="(l, id) in LEVELS" :key="id"><input type="radio" name="level" :checked="a.level === id" @change="a.level = id as Level" /><span>{{ l }}</span></label>
          </div>
        </fieldset>

        <fieldset class="step">
          <legend><b>04</b> Έξτρα</legend>
          <div class="chips">
            <label v-for="(x, id) in EXTRAS" :key="id"><input type="checkbox" :checked="a.extras.includes(id as Extra)" @change="toggleExtra(id as Extra)" /><span>{{ x.label }}</span></label>
          </div>
        </fieldset>
      </form>

      <aside class="result" aria-live="polite">
        <p class="label">ΕΝΔΕΙΚΤΙΚΗ ΕΚΤΙΜΗΣΗ</p>
        <p class="price">{{ range(e) }}</p>
        <p class="sum">{{ summary(a) }} Οι τιμές είναι ενδεικτικές <span class="ph">[ΤΙΜΟΚΑΤΑΛΟΓΟΣ]</span>.</p>
        <div class="bars" aria-hidden="true">
          <i v-for="p in parts" :key="p.k" :style="{ flexGrow: Math.max(p.v, 1) }" :class="{ zero: !p.v }" />
        </div>
        <dl>
          <div v-for="p in parts" :key="p.k"><dt>{{ p.k }}</dt><dd>{{ formatNum(p.v) }} €</dd></div>
          <div class="per"><dt>Περίπου ανά m²</dt><dd>{{ formatNum(e.perM2) }} €</dd></div>
        </dl>
        <template v-if="!open">
          <button type="button" class="cta" @click="open = true">Ζητήστε επίσκεψη και προσφορά</button>
        </template>
        <div v-else-if="sent" class="ticket" role="status"><b>{{ sent }}</b><span>Το αίτημα καταγράφηκε μόνο στη συσκευή σας. Σε πραγματική υπηρεσία θα σας καλούσαμε για να κλείσουμε επίσκεψη.</span></div>
        <form v-else class="req" novalidate @submit.prevent="submit">
          <div class="f"><label for="r-name">Όνομα</label><input id="r-name" v-model="form.name" autocomplete="off" :aria-invalid="!!errors.name" /><p v-if="errors.name" class="err">{{ errors.name }}</p></div>
          <div class="f"><label for="r-phone">Τηλέφωνο</label><input id="r-phone" v-model="form.phone" inputmode="tel" autocomplete="off" :aria-invalid="!!errors.phone" /><p v-if="errors.phone" class="err">{{ errors.phone }}</p></div>
          <fieldset class="f"><legend>Πότε σας βολεύει να σας καλέσουμε;</legend>
            <div class="chips"><label v-for="w in whens" :key="w[0]"><input v-model="form.when" type="radio" name="when" :value="w[0]" /><span>{{ w[1] }}</span></label></div>
            <p v-if="errors.when" class="err">{{ errors.when }}</p></fieldset>
          <p class="hint">Δοκιμαστική φόρμα: γράψτε φανταστικά στοιχεία.</p>
          <button type="submit" class="cta">Αποστολή αιτήματος</button>
        </form>
        <p class="hint">Η εκτίμηση δεν είναι προσφορά. Ο τελικός προϋπολογισμός εξαρτάται από την κατάσταση του χώρου.</p>
      </aside>
    </div>
  </main>
</template>
