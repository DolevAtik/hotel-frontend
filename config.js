// Runtime configuration for the hotel frontend.
//
// This is the DEFAULT used for local development (docker run / opening the
// page directly). In Kubernetes this file is replaced at runtime by the
// hotel-frontend-config ConfigMap (see k8s/configmap.yaml) — no image rebuild
// is required to point the app at a different backend.
//
// NOTE: this URL is resolved by the user's BROWSER, so it must be an address
// the browser can reach (Ingress / LoadBalancer / NodePort) — NOT an internal
// cluster Service DNS name like http://hotel-backend:5000.
window.__API_BASE__ = "http://localhost:5000";
