<template>
  <!-- <div class="display-flex align-center justify-center h-100"> -->
  <v-container>
    <v-row>
      <v-col class="ma-10">
        <div class="text-h2 text-center">SAML Investigator 🔍</div>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-textarea label="Paste payload" v-model="payload"></v-textarea>
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
const decoded = ref("");
const impersonated = ref("");

watch(payload, () => {
  parsePayload();
});

const parsePayload = () => {
  if (payload.value.length > 0) {
    var decoder = new Decoder(payload.value).uriDecode().base64Decode().inflate().utf8Parse().format();

    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(decoder.toString(), "text/xml");

    var response = new SamlResponse(xmlDoc);
    // console.log(response.convertToImpersonated("new-id").xml);

    window.xmlDoc = xmlDoc

    decoded.value = decoder.toString()
    impersonated.value = response.convertToImpersonated("new-id").toString()
    nextTick(() => Prism.highlightAll())
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