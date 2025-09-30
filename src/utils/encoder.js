export default function encode(plaintextPayload) {
    return btoa(plaintextPayload.trim())
}
