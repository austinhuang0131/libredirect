"use strict"

window.browser = window.browser || window.chrome

import utils from "./utils.js"
import { FrontEnd } from "./frontend.js"

export let Imdb = await FrontEnd({
	enable: true,
	name: "imdb",
	frontends: ["libremdb"],
	redirect: (url, type) => {
		const targets = [/^https?:\/{2}(?:www\.|)imdb\.com.*/]
		if (!targets.some(rx => rx.test(url.href))) return

		if (url.pathname == "/") return "SKIP"
		if (type != "main_frame") return "SKIP"

		const protocolHost = utils.protocolHost(url)
		return `${protocolHost}${url.pathname}`
	},
	reverse: url => {
		return `https://imdb.com${url.pathname}${url.search}`
	},
})

export let Imgur = await FrontEnd({
	enable: true,
	name: "imgur",
	frontends: ["rimgo"],
	redirect: (url, type) => {
		const targets = /^https?:\/{2}([im]\.)?imgur\.(com|io)(\/|$)/
		if (!targets.test(url.href)) return

		if (!["main_frame", "sub_frame", "xmlhttprequest", "other", "image", "media"].includes(type)) return "SKIP"
		if (url.pathname == "/") return "SKIP"
		if (url.pathname.includes("delete/")) return "SKIP"

		const protocolHost = utils.protocolHost(url)
		return `${protocolHost}${url.pathname}${url.search}`

		// https://imgur.com/gallery/s4WXQmn
		// https://imgur.com/a/H8M4rcp
		// https://imgur.com/gallery/gYiQLWy
		// https://imgur.com/gallery/cTRwaJU
		// https://i.imgur.com/CFSQArP.jpeg
	},
	reverse: url => {
		return `https://imgur.com${url.pathname}${url.search}`
	},
})

export let Instagram = await FrontEnd({
	enable: true,
	name: "instagram",
	frontends: ["bibliogram"],
	redirect: (url, type) => {
		const targets = /^https?:\/{2}(www\.)?instagram\.com/
		if (!targets.test(url.href)) return

		if (!["main_frame", "sub_frame", "xmlhttprequest", "other", "image", "media"].includes(type)) return "SKIP"

		const bypassPaths = [/about/, /explore/, /support/, /press/, /api/, /privacy/, /safety/, /admin/, /\/(accounts\/|embeds?.js)/]
		if (bypassPaths.some(rx => rx.test(url.pathname))) return "SKIP"

		const protocolHost = utils.protocolHost(url)

		const reservedPaths = ["u", "p", "privacy"]
		if (url.pathname === "/" || reservedPaths.includes(url.pathname.split("/")[1])) return `${protocolHost}${url.pathname}${url.search}`
		if (url.pathname.startsWith("/reel") || url.pathname.startsWith("/tv")) return `${protocolHost}/p${url.pathname.replace(/\/reel|\/tv/i, "")}${url.search}`
		return `${protocolHost}/u${url.pathname}${url.search}` // Likely a user profile, redirect to '/u/...'
	},
	reverse: url => {
		if (url.pathname.startsWith("/p")) return `https://instagram.com${url.pathname.replace("/p", "")}${url.search}`
		if (url.pathname.startsWith("/u")) return `https://instagram.com${url.pathname.replace("/u", "")}${url.search}`
		return `https://instagram.com${url.pathname}${url.search}`
	},
})

export let Lbry = await FrontEnd({
	enable: true,
	name: "lbry",
	frontends: ["librarian", "lbryDesktop"],
	redirect: (url, type, frontend, redirectType) => {
		const targets = [/^https?:\/{2}odysee\.com/]
		if (!targets.some(rx => rx.test(url.href))) return

		if (type == "sub_frame" && redirectType == "main_frame") return "SKIP"

		const protocolHost = utils.protocolHost(url)
		switch (type) {
			case "main_frame":
				switch (frontend) {
					case "librarian":
						return `${protocolHost}${url.pathname}${url.search}`
					case "lbryDesktop":
						return url.href.replace(/^https?:\/{2}odysee\.com\//, "lbry://").replace(/:(?=[a-zA-Z0-9])/g, "#")
				}
			case "sub_frame":
				return `${protocolHost}${url.pathname}${url.search}`.replace(/\/(?=[a-f0-9]{40})/, ":")
		}
	},
})

// redirects.osm.normal = ["https://www.openstreetmap.org"]
export let Maps = await FrontEnd({
	enable: true,
	name: "maps",
	frontends: ["osm", "facilMap"],
	redirect: url => {
		const targets = /^https?:\/{2}(((www|maps)\.)?(google\.).*(\/maps)|maps\.(google\.).*)/
		if (!url.href.match(targets)) return

		const mapCentreRegex = /@(-?\d[0-9.]*),(-?\d[0-9.]*),(\d{1,2})[.z]/
		const dataLatLngRegex = /!3d(-?[0-9]{1,}.[0-9]{1,})!4d(-?[0-9]{1,}.[0-9]{1,})/
		const placeRegex = /\/place\/(.*)\//
		const travelModes = {
			driving: "fossgis_osrm_car",
			walking: "fossgis_osrm_foot",
			bicycling: "fossgis_osrm_bike",
			transit: "fossgis_osrm_car", // not implemented on OSM, default to car.
		}
		const travelModesFacil = {
			driving: "car",
			walking: "pedestrian",
			bicycling: "bicycle",
			transit: "car", // not implemented on Facil, default to car.
		}
		const osmLayers = {
			none: "S",
			transit: "T",
			traffic: "S", // not implemented on OSM, default to standard.
			bicycling: "C",
		}
		function addressToLatLng(address) {
			const xmlhttp = new XMLHttpRequest()
			xmlhttp.open("GET", `https://nominatim.openstreetmap.org/search/${address}?format=json&limit=1`, false)
			xmlhttp.send()
			if (xmlhttp.status === 200) {
				const json = JSON.parse(xmlhttp.responseText)[0]
				if (json) {
					console.log("json", json)
					return [`${json.lat},${json.lon}`, `${json.boundingbox[2]},${json.boundingbox[1]},${json.boundingbox[3]},${json.boundingbox[0]}`]
				}
			}
			console.info("Error: Status is " + xmlhttp.status)
		}

		let mapCentre = "#"
		let prefs = {}

		if (url.pathname.match(mapCentreRegex)) {
			// Set map centre if present
			var [, lat, lon, zoom] = url.pathname.match(mapCentreRegex)
		} else if (url.searchParams.has("center")) {
			var [lat, lon] = url.searchParams.get("center").split(",")
			var zoom = url.searchParams.get("zoom") ?? "17"
		}

		if (lat && lon && zoom) {
			if (mapsFrontend == "osm") mapCentre = `#map=${zoom}/${lat}/${lon}`
			if (mapsFrontend == "facil") mapCentre = `#${zoom}/${lat}/${lon}`
		}

		if (url.searchParams.get("layer")) prefs.layers = osmLayers[url.searchParams.get("layer")]

		const protocolHost = utils.protocolHost(url)
		if (url.pathname.includes("/embed")) {
			// Handle Google Maps Embed API
			// https://www.google.com/maps/embed/v1/place?key=AIzaSyD4iE2xVSpkLLOXoyqT-RuPwURN3ddScAI&q=Eiffel+Tower,Paris+France
			console.log("embed life")

			let query = ""
			if (url.searchParams.has("q")) query = url.searchParams.get("q")
			else if (url.searchParams.has("query")) query = url.searchParams.has("query")
			else if (url.searchParams.has("pb"))
				try {
					query = url.searchParams.get("pb").split(/!2s(.*?)!/)[1]
				} catch (error) {
					console.error(error)
				} // Unable to find map marker in URL.

			let [coords, boundingbox] = addressToLatLng(query)
			prefs.bbox = boundingbox
			prefs.marker = coords
			prefs.layer = "mapnik"
			let prefsEncoded = new URLSearchParams(prefs).toString()
			if (mapsFrontend == "osm") return `${protocolHost}/export/embed.html?${prefsEncoded}`
			if (mapsFrontend == "facil") return `${protocolHost}/#q=${query}`
		} else if (url.pathname.includes("/dir")) {
			// Handle Google Maps Directions
			// https://www.google.com/maps/dir/?api=1&origin=Space+Needle+Seattle+WA&destination=Pike+Place+Market+Seattle+WA&travelmode=bicycling

			let travMod = url.searchParams.get("travelmode")
			if (url.searchParams.has("travelmode")) prefs.engine = travelModes[travMod]

			let orgVal = url.searchParams.get("origin")
			let destVal = url.searchParams.get("destination")

			let org
			addressToLatLng(orgVal, a => (org = a))
			let dest
			addressToLatLng(destVal, a => (dest = a))
			prefs.route = `${org};${dest}`

			let prefsEncoded = new URLSearchParams(prefs).toString()
			if (mapsFrontend == "osm") return `${protocolHost}/directions?${prefsEncoded}${mapCentre}`
			if (mapsFrontend == "facil") return `${protocolHost}/#q=${orgVal}%20to%20${destVal}%20by%20${travelModesFacil[travMod]}`
		} else if (url.pathname.includes("data=") && url.pathname.match(dataLatLngRegex)) {
			// Get marker from data attribute
			// https://www.google.com/maps/place/41%C2%B001'58.2%22N+40%C2%B029'18.2%22E/@41.032833,40.4862063,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0xf64286eaf72fc49d!7e2!8m2!3d41.0328329!4d40.4883948
			console.log("data life")

			let [, mlat, mlon] = url.pathname.match(dataLatLngRegex)

			if (mapsFrontend == "osm") return `${protocolHost}/search?query=${mlat}%2C${mlon}`
			if (mapsFrontend == "facil") return `${protocolHost}/#q=${mlat}%2C${mlon}`
		} else if (url.searchParams.has("ll")) {
			// Get marker from ll param
			// https://maps.google.com/?ll=38.882147,-76.99017
			console.log("ll life")

			const [mlat, mlon] = url.searchParams.get("ll").split(",")

			if (mapsFrontend == "osm") return `${protocolHost}/search?query=${mlat}%2C${mlon}`
			if (mapsFrontend == "facil") return `${protocolHost}/#q=${mlat}%2C${mlon}`
		} else if (url.searchParams.has("viewpoint")) {
			// Get marker from viewpoint param.
			// https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=48.857832,2.295226&heading=-45&pitch=38&fov=80
			console.log("viewpoint life")

			const [mlat, mlon] = url.searchParams.get("viewpoint").split(",")

			if (mapsFrontend == "osm") return `${protocolHost}/search?query=${mlat}%2C${mlon}`
			if (mapsFrontend == "facil") return `${protocolHost}/#q=${mlat}%2C${mlon}`
		} else {
			// Use query as search if present.
			console.log("normal life")

			let query
			if (url.searchParams.has("q")) query = url.searchParams.get("q")
			else if (url.searchParams.has("query")) query = url.searchParams.get("query")
			else if (url.pathname.match(placeRegex)) query = url.pathname.match(placeRegex)[1]

			let prefsEncoded = new URLSearchParams(prefs).toString()
			if (query) {
				if (mapsFrontend == "osm") return `${protocolHost}/search?query="${query}${mapCentre}&${prefsEncoded}`
				if (mapsFrontend == "facil") return `${protocolHost}/${mapCentre}/Mpnk/${query}`
			}
		}

		let prefsEncoded = new URLSearchParams(prefs).toString()
		console.log("mapCentre", mapCentre)
		console.log("prefs", prefs)
		console.log("prefsEncoded", prefsEncoded)
		if (mapsFrontend == "osm") return `${protocolHost}/${mapCentre}&${prefsEncoded}`
		if (mapsFrontend == "facil") return `${protocolHost}/${mapCentre}/Mpnk`
	},
})

export let Medium = await FrontEnd({
	enable: true,
	name: "medium",
	frontends: ["scribe"],
	redirect: (url, type) => {
		const targets = [
			// /(?:.*\.)*(?<!(link\.|cdn\-images\-\d+\.))medium\.com(\/.*)?$/,
			/^medium\.com/,
			/.*\.medium\.com/,
			// // Other domains of medium blogs, source(s): https://findingtom.com/best-medium-blogs-to-follow/#1-forge

			/^towardsdatascience\.com/,
			/^uxdesign\.cc/,
			/^uxplanet\.org/,
			/^betterprogramming\.pub/,
			/^aninjusticemag\.com/,
			/^betterhumans\.pub/,
			/^psiloveyou\.xyz/,
			/^entrepreneurshandbook\.co/,
			/^blog\.coinbase\.com/,

			/^ levelup\.gitconnected\.com /,
			/^javascript\.plainenglish\.io /,
			/^blog\.bitsrc\.io /,
			/^ itnext\.io /,
			/^codeburst\.io /,
			/^infosecwriteups\.com /,
			/^ blog\.devgenius.io /,
			/^ writingcooperative\.com /,
		]
		if (!targets.some(rx => rx.test(url.host))) return
		if (/^\/(@[a-zA-Z.]{0,}(\/|)$)/.test(url.pathname)) return "SKIP"
		if (url.pathname == "/") return "SKIP"
		if (type != "main_frame" && "sub_frame" && "xmlhttprequest" && "other") return "SKIP"

		const protocolHost = utils.protocolHost(url)
		return `${protocolHost}${url.pathname}${url.search}`
	},
})

export let Peertube = await FrontEnd({
	enable: true,
	name: "peertube",
	frontends: ["simpleertube"],
	redirect: (url, type) => {
		if (type != "main_frame") return "SKIP"

		const protocolHost = utils.protocolHost(url)
		if (url.host == "search.joinpeertube.org" || url.host == "sepiasearch.org") return protocolHost
		return `${protocolHost}/${url.host}${url.pathname}${url.search}`
	},
})

export let Quora = await FrontEnd({
	enable: true,
	name: "quora",
	frontends: ["quetre"],
	redirect: (url, type) => {
		const targets = [/^https?:\/{2}(www\.|)quora\.com.*/]
		if (!targets.some(rx => rx.test(url.href))) return
		if (url.pathname == "/") return "SKIP"
		if (type != "main_frame") return "SKIP"
		const protocolHost = utils.protocolHost(url)
		return `${protocolHost}${url.pathname}`
	},
	reverse: url => {
		return `https://quora.com${url.pathname}${url.search}`
	},
})

export let Reddit = await FrontEnd({
	enable: true,
	name: "reddit",
	frontends: ["libreddit", "teddit"],
	cookies: {
		libreddit: ["theme", "front_page", "layout", "wide", "post_sort", "comment_sort", "show_nsfw", "autoplay_videos", "use_hls", "hide_hls_notification", "subscriptions", "filters"],
		teddit: [
			"collapse_child_comments",
			"domain_instagram",
			"domain_twitter",
			"domain_youtube",
			"flairs",
			"highlight_controversial",
			"nsfw_enabled",
			"post_media_max_height",
			"show_upvoted_percentage",
			"show_upvotes",
			"theme",
			"videos_muted",
		],
	},
	redirect: (url, type, frontend) => {
		const targets = [/^https?:\/{2}(www\.|old\.|np\.|new\.|amp\.|)reddit\.com/, /^https?:\/{2}(i\.|preview\.)redd\.it/]
		if (!targets.some(rx => rx.test(url.href))) return

		const bypassTypes = ["main_frame", "xmlhttprequest", "other", "image", "media"]
		if (!bypassTypes.includes(type)) return "SKIP"

		const bypassPaths = /\/(gallery\/poll\/rpan\/settings\/topics)/
		if (url.pathname.match(bypassPaths)) return "SKIP"

		const protocolHost = utils.protocolHost(url)

		if (url.host === "i.redd.it") {
			if (frontend == "libreddit") return `${protocolHost}/img${url.pathname}${url.search}`
			if (frontend == "teddit") return `${protocolHost}/pics/w:null_${url.pathname.substring(1)}${url.search}`
		}

		if (url.host === "redd.it") {
			return `${protocolHost}/comments${url.pathname}${url.search}`
		}

		if (url.host === "preview.redd.it") {
			if (frontend == "libreddit") return `${protocolHost}/preview/pre${url.pathname}${url.search}`
			if (frontend == "teddit") return "SKIP"
		}

		return `${url.href}`
		// https://libreddit.exonip.de/vid/1mq8d0ma3yk81/720.mp4
		// https://libreddit.exonip.de/img/4v3t1vgvrzk81.png

		// https://teddit.net/vids/1mq8d0ma3yk81.mp4
		// https://teddit.net/pics/w:null_4v3t1vgvrzk81.png

		// redd.it/t5379n
		// https://v.redd.it/z08avb339n801/DASH_1_2_M
		// https://i.redd.it/bfkhs659tzk81.jpg
	},
})

export let Reuters = await FrontEnd({
	enable: true,
	name: "reuters",
	frontends: ["neuters"],
	redirect: (url, type) => {
		const targets = [/^https?:\/{2}(www\.|)reuters\.com.*/]
		if (!targets.some(rx => rx.test(url.href))) return

		if (type != "main_frame") return "SKIP"

		const protocolHost = utils.protocolHost(url)
		// stolen from https://addons.mozilla.org/en-US/firefox/addon/reuters-redirect/
		if (url.pathname.startsWith("/article/") || url.pathname.startsWith("/pf/") || url.pathname.startsWith("/arc/") || url.pathname.startsWith("/resizer/")) return null
		else if (url.pathname.endsWith("/")) return `${protocolHost}${url.pathname}`
		else return `${protocolHost}${url.pathname}/`
	},
})

export let Search = await FrontEnd({
	enable: true,
	name: "search",
	frontends: ["searxng", "searx", "whoogle", "librex"],
	cookies: {
		searx: [
			"advanced_search",
			"autocomplete",
			"categories",
			"disabled_engines",
			"disabled_plugins",
			"doi_resolver",
			"enabled_engines",
			"enabled_plugins",
			"image_proxy",
			"language",
			"locale",
			"method",
			"oscar-style",
			"results_on_new_tab",
			"safesearch",
			"theme",
			"tokens",
		],
		searxng: [
			"autocomplete",
			"categories",
			"disabled_engines",
			"disabled_plugins",
			"doi_resolver",
			"enabled_plugins",
			"enabled_engines",
			"image_proxy",
			"infinite_scroll",
			"language",
			"locale",
			"maintab",
			"method",
			"query_in_title",
			"results_on_new_tab",
			"safesearch",
			"simple_style",
			"theme",
			"tokens",
		],
		librex: ["bibliogram", "disable_special", "invidious", "libreddit", "nitter", "proxitok", "theme", "wikiless"],
	},
	redirect: url => {
		const targets = [/^https?:\/{2}search\.libredirect\.invalid/]
		if (!targets.some(rx => rx.test(url.href))) return

		let path
		if (searchFrontend == "searx") path = "/"
		else if (searchFrontend == "searxng") path = "/"
		else if (searchFrontend == "whoogle") path = "/search"
		else if (searchFrontend == "librex") path = "/search.php"

		const protocolHost = utils.protocolHost(url)
		const searchQuery = `?q=${encodeURIComponent(url.searchParams.get("q"))}`
		return `${protocolHost}${path}${searchQuery}`
	},
})

export let SendTargets = await FrontEnd({
	enable: true,
	name: "sendTargets",
	frontends: ["send"],
	redirect: (url, type) => {
		const targets = [/^https?:\/{2}send\.libredirect\.invalid\/$/, /^ https ?: \/\/send\.firefox\.com\/$/, /^https?:\/{2}sendfiles\.online\/$/]
		if (!targets.some(rx => rx.test(url.href))) return
		if (type != "main_frame") return "SKIP"

		const protocolHost = utils.protocolHost(url)
		return protocolHost
	},
})

export let Tiktok = await FrontEnd({
	enable: true,
	name: "tiktok",
	frontends: ["proxiTok"],
	redirect: (url, type) => {
		const targets = [/^https?:\/{2}(www\.|)tiktok\.com.*/]
		if (!targets.some(rx => rx.test(url.href))) return
		if (type != "main_frame") return "SKIP"
		const protocolHost = utils.protocolHost(url)
		return `${protocolHost}${url.pathname}`
	},
	reverse: url => {
		return `https://tiktok.com${url.pathname}${url.search}`
	},
})

export let Translate = await FrontEnd({
	enable: true,
	name: "translate",
	frontends: ["simplyTranslate", "lingva"],
	cookies: {
		simplyTranslate: ["from_lang", "to_lang", "tts_enabled", "use_text_fields"],
	},
	localStorage: { lingva: ["chakra-ui-color-mode", "isauto", "source", "target"] },
	redirect: url => {
		const targets = [/^https?:\/{2}translate\.google(\.[a-z]{2,3}){1,2}\//]
		if (!targets.some(rx => rx.test(url.href))) return
		const protocolHost = utils.protocolHost(url)

		if (translateFrontend == "simplyTranslate") {
			return `${protocolHost}/${url.search}`
		}
		if (translateFrontend == "lingva") {
			let params_arr = url.search.split("&")
			params_arr[0] = params_arr[0].substring(1)
			let params = {}
			for (let i = 0; i < params_arr.length; i++) {
				let pair = params_arr[i].split("=")
				params[pair[0]] = pair[1]
			}
			if (params.sl && params.tl && params.text) {
				return `${protocolHost}/${params.sl}/${params.tl}/${params.text}`
			}
			return protocolHost
		}
	},
	reverse: url => {
		return `https://imgur.com${url.pathname}${url.search}`
	},
})

export let Nitter = await FrontEnd({
	enable: true,
	name: "nitter",
	frontends: ["nitter"],
	cookies: {
		nitter: [
			"theme",
			"infiniteScroll",
			"stickyProfile",
			"bidiSupport",
			"hideTweetStats",
			"hideBanner",
			"hidePins",
			"hideReplies",
			"squareAvatars",
			"mp4Playback",
			"hlsPlayback",
			"proxyVideos",
			"muteVideos",
			"autoplayGifs",
			"replaceInstagram",
			"replaceReddit",
			"replaceTwitter",
			"replaceYouTube",
		],
	},
	redirect: (url, type) => {
		const targets = [/^https?:\/{2}(www\.|mobile\.|)twitter\.com/, /^https?:\/{2}(pbs\.|video\.|)twimg\.com/, /^https?:\/{2}platform\.twitter\.com\/embed/, /^https?:\/{2}t\.co/]
		if (!targets.some(rx => rx.test(url.href))) return
		if (url.pathname.split("/").includes("home")) return "SKIP"
		if (twitterRedirectType == "main_frame" && type != "main_frame") return "SKIP"

		let search = new URLSearchParams(url.search)

		search.delete("ref_src")
		search.delete("ref_url")

		search = search.toString()
		if (search !== "") search = `?${search}`

		const protocolHost = utils.protocolHost(url)

		// https://pbs.twimg.com/profile_images/648888480974508032/66_cUYfj_400x400.jpg
		if (url.host.split(".")[0] === "pbs" || url.host.split(".")[0] === "video") {
			const [, id, format, extra] = search.match(/(.*)\?format=(.*)&(.*)/)
			const query = encodeURIComponent(`${id}.${format}?${extra}`)
			return `${protocolHost}/pic${search}${query}`
		}
		if (url.pathname.split("/").includes("tweets")) {
			return `${protocolHost}${url.pathname.replace("/tweets", "")}${search}`
		}
		if (url.host == "t.co") {
			return `${protocolHost}/t.co${url.pathname}`
		}
		return `${protocolHost}${url.pathname}${search}`
	},
	reverse: url => {
		return `https://twitter.com${url.pathname}${url.search}`
	},
	removeXFrameOptions: () => {
		let isChanged = false
		for (const i in e.responseHeaders) {
			if (e.responseHeaders[i].name == "x-frame-options") {
				e.responseHeaders.splice(i, 1)
				isChanged = true
			} else if (e.responseHeaders[i].name == "content-security-policy") {
				e.responseHeaders.splice(i, 1)
				isChanged = true
			}
		}
		if (isChanged) return { responseHeaders: e.responseHeaders }
	},
})

export let Wikipedia = await FrontEnd({
	enable: true,
	name: "wikipedia",
	frontends: ["wikiless"],
	cookies: { wikiless: ["theme", "default_lang"] },
	redirect: url => {
		const targets = /^https?:\/{2}([a-z]+\.)*wikipedia\.org/
		if (!targets.test(url.href)) return

		let GETArguments = []
		if (url.search.length > 0) {
			let search = url.search.substring(1) //get rid of '?'
			let argstrings = search.split("&")
			for (let i = 0; i < argstrings.length; i++) {
				let args = argstrings[i].split("=")
				GETArguments.push([args[0], args[1]])
			}
		}

		const protocolHost = utils.protocolHost(url)
		let link = `${protocolHost}${url.pathname}`
		let urlSplit = url.host.split(".")
		if (urlSplit[0] != "wikipedia" && urlSplit[0] != "www") {
			if (urlSplit[0] == "m") GETArguments.push(["mobileaction", "toggle_view_mobile"])
			else GETArguments.push(["lang", urlSplit[0]])
			if (urlSplit[1] == "m") GETArguments.push(["mobileaction", "toggle_view_mobile"])
			// wikiless doesn't have mobile view support yet
		}
		for (let i = 0; i < GETArguments.length; i++) {
			link += (i == 0 ? "?" : "&") + GETArguments[i][0] + "=" + GETArguments[i][1]
		}
		return link
	},
})

export let Youtube = await FrontEnd({
	enable: true,
	name: "youtube",
	frontends: ["invidious", "piped", "pipedMaterial", "cloudtube"],
	frontend: "invidious",
	cookies: { invidious: ["PREFS"] },
	localStorage: {
		piped: [
			"bufferGoal",
			"comments",
			"disableLBRY",
			"enabledCodecs",
			"hl",
			"homepage",
			"instance",
			"listen",
			"minimizeDescription",
			"playerAutoPlay",
			"proxyLBRY",
			"quality",
			"region",
			"selectedSkip",
			"sponsorblock",
			"theme",
			"volume",
			"watchHistory",
		],
		pipedMaterial: ["PREFERENCES"],
	},
	redirect: (url, type) => {
		const targets = [
			/^https?:\/{2}(www\.|music\.|m\.|)youtube\.com(\/.*|$)/,

			/^https?:\/{2}img\.youtube\.com\/vi\/.*\/..*/, // https://stackoverflow.com/questions/2068344/how-do-i-get-a-youtube-video-thumbnail-from-the-youtube-api
			/^https?:\/{2}(i|s)\.ytimg\.com\/vi\/.*\/..*/,

			/^https?:\/{2}(www\.|music\.|)youtube\.com\/watch\?v\=..*/,

			/^https?:\/{2}youtu\.be\/..*/,

			/^https?:\/{2}(www\.|)(youtube|youtube-nocookie)\.com\/embed\/..*/,
		]
		if (!targets.some(rx => rx.test(url.href))) return
		if (type != ("main_frame" || "sub_frame")) return "SKIP"
		if (url.pathname.match(/iframe_api/) || url.pathname.match(/www-widgetapi/)) return "SKIP" // Don't redirect YouTube Player API.
		if (onlyEmbeddedVideo == "onlyNotEmbedded" && type == "sub_frame") return "SKIP"

		// return url.href.replace(/^https?:\/{2}/, "yattee://")
		// return `freetube://${url.href}`

		const protocolHost = utils.protocolHost(url)
		return `${protocolHost}${url.pathname}${url.search}`
	},
	reverse: url => {
		return `https://youtube.com${url.pathname}${url.search}`
	},
})

export let YoutubeMusic = await FrontEnd({
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
	},
})

export const frontends = [Youtube, YoutubeMusic, Twitter, Instagram, Reddit, Search, Translate, Maps, Wikipedia, Medium, Quora, Imdb, Reuters, Imgur, Tiktok, SendTargets, Peertube, Lbry]
