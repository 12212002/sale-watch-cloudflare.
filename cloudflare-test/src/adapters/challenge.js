// A storefront may include CAPTCHA libraries for its contact/login forms.
// Those scripts alone are not an access challenge on a public product page.
export function isChallenge(html){
 const visible=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<!--[\s\S]*?-->/g,'');
 return /(?:verify (?:that )?you are human|access denied|unusual traffic|complete (?:the |this )?(?:captcha|security check)|<title[^>]*>\s*(?:captcha|security check|just a moment)|id=["'](?:sec-if-cpt-container|challenge-form|cf-challenge-running)["'])/i.test(visible);
}
