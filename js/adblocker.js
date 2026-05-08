// Ad blocker disabled.
//
// This file is intentionally kept as a no-op because index.html still imports it.
// The previous implementation loaded a third-party filter engine and patched
// browser APIs such as fetch, XMLHttpRequest, window.open, Date.now, eval, and
// Function. Since it was unreliable and could break normal app behavior, it has
// been made unusable on purpose.
//
// Leave this module without side effects. If ad blocking is added again later,
// prefer a narrow implementation that does not globally monkey-patch browser
// primitives or remove arbitrary DOM nodes.
