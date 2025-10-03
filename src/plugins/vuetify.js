/**
 * plugins/vuetify.js
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'
import { VStepperVertical, VStepperVerticalItem } from 'vuetify/labs/VStepperVertical'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
export default createVuetify({
  theme: {
    defaultTheme: 'customTheme',
    themes: {
      customTheme: {
        dark: true,
        colors: {
          primary: '#FCFF6C',
          secondary: '#14248A',
          success: '#D7FFAB'
        }
      }
    }
  },
  components: {
    VStepperVertical,
    VStepperVerticalItem
  }
})
