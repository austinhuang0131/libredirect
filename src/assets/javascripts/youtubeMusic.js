"use strict"

window.browser = window.browser || window.chrome

import utils from "./utils.js"
import { FrontEnd } from "./frontend.js"

export default await FrontEnd({
	enable: true,
	name: "youtubeMusic",
	frontends: ["beatbump", "hyperpipe"],
	redirect: url => {
		const targets = [/^https?:\/{2}music\.youtube\.com(\/.*|$)/]
		if (!targets.some(rx => rx.test(url.href))) return

		const protocolHost = utils.protocolHost(url)
		if (these.frontend == "beatbump") {
			return url.href
				.replace("/watch?v=", "/listen?id=")
				.replace("/channel/", "/artist/")
				.replace("/playlist?list=", "/playlist/VL")
				.replace(/\/search\?q=.*/, searchQuery => searchQuery.replace("?q=", "/") + "?filter=song")
		}
		if (these.frontend == "hyperpipe") {
			return url.href.replace(/\/search\?q=.*/, searchQuery => searchQuery.replace("?q=", "/"))
		}
	},
})

/* 
Video
https://music.youtube.com/watch?v=_PkGiKBW-DA&list=RDAMVM_PkGiKBW-DA
https://beatbump.ml/listen?id=_PkGiKBW-DA&list=RDAMVM_PkGiKBW-DA

Playlist
https://music.youtube.com/playlist?list=PLqxd0OMLeWy64zlwhjouj92ISc38FbOns
https://beatbump.ml/playlist/VLPLqxd0OMLeWy64zlwhjouj92ISc38FbOns

Channel
https://music.youtube.com/channel/UCfgmMDI7T5tOQqjnOBRe_wg
https://beatbump.ml/artist/UCfgmMDI7T5tOQqjnOBRe_wg

Albums
https://music.youtube.com/playlist?list=OLAK5uy_n-9HVh3cryV2gREZM9Sc0JwEKYjjfi0dU
https://music.youtube.com/playlist?list=OLAK5uy_lcr5O1zS8f6WIFI_yxqVp2RK9Dyy2bbw0
https://beatbump.ml/release?id=MPREb_3DURc4yEUtD
https://beatbump.ml/release?id=MPREb_evaZrV1WNdS

https://music.youtube.com/playlist?list=OLAK5uy_n6OHVllUZUCnlIY1m-gUaH8uqkN3Y-Ca8
https://music.youtube.com/playlist?list=OLAK5uy_nBOTxAc3_RGB82-Z54jdARGxGaCYlpngY
https://beatbump.ml/release?id=MPREb_QygdC0wEoLe

https://music.youtube.com/watch?v=R6gSMSYKhKU&list=OLAK5uy_n-9HVh3cryV2gREZM9Sc0JwEKYjjfi0dU

Search
https://music.youtube.com/search?q=test
https://beatbump.ml/search/test?filter=EgWKAQIIAWoKEAMQBBAKEAkQBQ%3D%3D

*/
