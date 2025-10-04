<template>
    <v-stepper-vertical color="secondary" v-model="step" flat>
          <template v-slot:default="{ step }">
            <v-stepper-vertical-item title="Remove Old Signature Block" :complete="step > 1" value="1">
                <v-progress-circular
                color="primary"
                :model-value="spinnerProgress"
                :rotate="spinnerProgress * 2"
                ></v-progress-circular>
                <template v-slot:next>
                </template>
                <template v-slot:prev>
                </template> 
            </v-stepper-vertical-item>
            <v-stepper-vertical-item title="Replace IssueInstant and NotOnOrBefore" :complete="step > 2" value="2">
                <v-progress-circular
                color="primary"
                :model-value="spinnerProgress"
                :rotate="spinnerProgress * 2"
                ></v-progress-circular>
                <template v-slot:next>
                </template>
                <template v-slot:prev>
                </template> 
            </v-stepper-vertical-item>
            
            <v-stepper-vertical-item title="Replace NotOnOrAfter" :complete="step > 3" value="3">
                <v-progress-circular
                color="primary"
                :model-value="spinnerProgress"
                :rotate="spinnerProgress * 2"
                ></v-progress-circular>
                <template v-slot:next>
                </template>
                <template v-slot:prev>
                </template> 
            </v-stepper-vertical-item>
            
            <v-stepper-vertical-item title="Replace ID Attributes" :complete="step > 4" value="4">
                <v-progress-circular
                color="primary"
                :model-value="spinnerProgress"
                :rotate="spinnerProgress * 2"
                ></v-progress-circular>
                <template v-slot:next>
                </template>
                <template v-slot:prev>
                </template> 
            </v-stepper-vertical-item>
            
            <v-stepper-vertical-item title="Done" :complete="step == 5" value="5">
                <template v-slot:next>
                </template>
                <template v-slot:prev>
                </template> 
            </v-stepper-vertical-item>
          </template>
    </v-stepper-vertical>
</template>

<script setup>

const step = shallowRef(0)
const spinnerProgress = shallowRef(0)

const interval = 5000.0

onMounted(async() => {
    let stepCount = 5
    let sleepInterval = 50.0
    for (const i of [...Array(interval * stepCount / sleepInterval).keys()]) {
        if (i % (interval / sleepInterval) == 0 && i != 0) {
            spinnerProgress.value = 100
            await sleepMs(500)
            step.value += 1
        }
        spinnerProgress.value = ((i) % (interval / sleepInterval)) / (interval / sleepInterval) * 100
        await sleepMs(sleepInterval)
    }
    step.value = 5
})

const sleepMs = (ms) => {
    return new Promise((res, rej) => setTimeout(res, ms))
}

</script>
