<template>
  <!-- <div class="display-flex align-center justify-center h-100"> -->
  <v-container>
    <v-row>
      <v-col class="ma-10">
        <div class="text-h2 text-center">SAML Investigator 🔍</div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="9">
        <v-textarea label="Paste payload" v-model="payload" class="h-100"></v-textarea>
      </v-col>
      <v-col cols="12" md="3">
        <v-container>
          <v-row>
            <v-col>
              <v-checkbox label="Sign Counterfeit Response" v-model="showPrivateKeyRow"></v-checkbox>
            </v-col>
          </v-row>
          <v-row v-if="showPrivateKeyRow">
            <v-col>
              <v-textarea label="Paste private key" v-model="privKey"></v-textarea>
            </v-col>
          </v-row>
          <v-row>
            <v-col>
              <v-dialog max-width="700">
                <template v-slot:activator="{ props: activatorProps }">
                  <v-btn class="w-100" color="yellow" prepend-icon="mdi-ticket" v-bind="activatorProps">Print Counterfeit Response</v-btn>
                </template>
                <template v-slot:default="{ isActive }">
                  <counterfeit-dialog :response="decoded" />
                </template>
              </v-dialog>
            </v-col>
          </v-row>
        </v-container>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="6">
        <pre>
          <code data-prismjs-copy="Copy" class="language-xml">{{ decoded }}</code>
        </pre>
      </v-col>
      <v-col cols="12" md="6">
        <pre>
          <code data-prismjs-copy="Copy" class="language-xml">{{ impersonated }}</code>
        </pre>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import Prism from "prismjs";

import "prismjs/themes/prism-twilight.css";
import "prismjs/plugins/toolbar/prism-toolbar.min";
import "prismjs/plugins/toolbar/prism-toolbar.min.css";
import "prismjs/plugins/copy-to-clipboard/prism-copy-to-clipboard";
import "prismjs/plugins/normalize-whitespace/prism-normalize-whitespace.min";


import Decoder from '@/utils/decoder';
import SamlResponse from "@/utils/samlResponse";

const payload = ref("");
const privKey = ref("");
const decoded = ref("");
const impersonated = ref("");
const showPrivateKeyRow = shallowRef(false);

watch(payload, () => {
  parsePayload()
})

// watch(privKey, () => {
//   parsePayload()
// })

const parsePayload = () => {
  if (payload.value.length > 0) {
    var decoder = new Decoder(payload.value).uriDecode().base64Decode().inflate().utf8Parse().format();

    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(decoder.toString(), "text/xml");

    // // var response = new SamlResponse(xmlDoc);
    // // console.log(response.convertToImpersonated("new-id").xml);

    window.xmlDoc = xmlDoc

    decoded.value = decoder.toString()
    // impersonated.value = response.convertToImpersonated("new-id").toString()
    nextTick(() => Prism.highlightAll())

    // if (privKey.value) {
    //   nextTick(() => {
    //     response.resign(privKey.value)
    //   })
    // }
  }
};

onMounted(() => {
  // window.Prism = window.Prism || {};
  // window.Prism.manual = true;

  Prism.plugins.NormalizeWhitespace.setDefaults({
    "remove-trailing": true,
    "remove-indent": true,
    "left-trim": true,
    "right-trim": true,
    "remove-initial-line-feed": true,
    /*"break-lines": 80,
    "indent": 2,
    "tabs-to-spaces": 4,
    "spaces-to-tabs": 4*/
});
})

</script>