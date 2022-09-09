"use strict"

window.browser = window.browser || window.chrome

import utils from "./utils.js"
import { FrontEnd } from "./frontend.js"

export default await FrontEnd({
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
		pipedMaterial: [
			"PREFERENCES"
		]
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

function removeXFrameOptions(e) {
	let isChanged = false

	if (e.type == "main_frame") {
		for (const i in e.responseHeaders) {
			if (e.responseHeaders[i].name == "content-security-policy") {
				let instancesList = []
				switch (protocol) {
					case "loki":
						switch (youtubeFrontend) {
							case "invidious":
								instancesList = [...invidiousLokiRedirectsChecks, ...invidiousLokiCustomRedirects]
								break
							case "piped":
								instancesList = [...pipedLokiRedirectsChecks, ...pipedLokiCustomRedirects]
								break
							case "pipedMaterial":
								instancesList = [...pipedMaterialLokiRedirectsChecks, ...pipedMaterialLokiCustomRedirects]
								break
							case "cloudtube":
								instancesList = [...cloudtubeLokiRedirectsChecks, ...cloudtubeLokiCustomRedirects]
						}
						break
					case "i2p":
						switch (youtubeFrontend) {
							case "invidious":
								instancesList = [...invidiousI2pRedirectsChecks, ...invidiousI2pCustomRedirects]
								break
							case "piped":
								instancesList = [...pipedI2pRedirectsChecks, ...pipedI2pCustomRedirects]
								break
							case "pipedMaterial":
								instancesList = [...pipedMaterialI2pRedirectsChecks, ...pipedMaterialI2pCustomRedirects]
								break
							case "cloudtube":
								instancesList = [...cloudtubeI2pRedirectsChecks, ...cloudtubeI2pCustomRedirects]
						}
						break
					case "tor":
						switch (youtubeFrontend) {
							case "invidious":
								instancesList = [...invidiousTorRedirectsChecks, ...invidiousTorCustomRedirects]
								break
							case "piped":
								instancesList = [...pipedTorRedirectsChecks, ...pipedTorCustomRedirects]
								break
							case "pipedMaterial":
								instancesList = [...pipedMaterialTorRedirectsChecks, ...pipedMaterialTorCustomRedirects]
								break
							case "cloudtube":
								instancesList = [...cloudtubeTorRedirectsChecks, ...cloudtubeTorCustomRedirects]
						}
				}
				if ((instancesList.length === 0 && protocolFallback) || protocol == "normal") {
					switch (youtubeFrontend) {
						case "invidious":
							instancesList = [...invidiousNormalRedirectsChecks, ...invidiousNormalCustomRedirects]
							break
						case "piped":
							instancesList = [...pipedNormalRedirectsChecks, ...pipedNormalCustomRedirects]
							break
						case "pipedMaterial":
							instancesList = [...pipedMaterialNormalRedirectsChecks, ...pipedMaterialNormalCustomRedirects]
							break
						case "cloudtube":
							instancesList = [...cloudtubeNormalRedirectsChecks, ...cloudtubeNormalCustomRedirects]
					}
				}
				let securityPolicyList = e.responseHeaders[i].value.split(";")
				for (const i in securityPolicyList) securityPolicyList[i] = securityPolicyList[i].trim()

				let newSecurity = ""
				for (const item of securityPolicyList) {
					if (item.trim() == "") continue
					let regex = item.match(/([a-z-]{0,}) (.*)/)
					if (regex == null) continue
					let [, key, vals] = regex
					if (key == "frame-src") vals = vals + " " + instancesList.join(" ")
					newSecurity += key + " " + vals + "; "
				}

				e.responseHeaders[i].value = newSecurity
				isChanged = true
			}
		}
	} else if (e.type == "sub_frame") {
		const url = new URL(e.url)
		const protocolHost = utils.protocolHost(url)
		if (all().includes(protocolHost)) {
			for (const i in e.responseHeaders) {
				if (e.responseHeaders[i].name == "x-frame-options") {
					e.responseHeaders.splice(i, 1)
					isChanged = true
				} else if (e.responseHeaders[i].name == "content-security-policy") {
					e.responseHeaders.splice(i, 1)
					isChanged = true
				}
			}
		}
	}
	if (isChanged) return { responseHeaders: e.responseHeaders }
}
