"use strict"

import generalHelper from "../../assets/javascripts/general.js"
import utils from "../../assets/javascripts/utils.js"

import Youtube from "../../assets/javascripts/youtube.js"
import YoutubeMusic from "../../assets/javascripts/youtubeMusic.js"
import Twitter from "../../assets/javascripts/twitter.js"
import Instagram from "../../assets/javascripts/instagram.js"
import Reddit from "../../assets/javascripts/reddit.js"
import Search from "../../assets/javascripts/search.js"
import Translate from "../../assets/javascripts/translate.js"
import Maps from "../../assets/javascripts/maps.js"
import Wikipedia from "../../assets/javascripts/wikipedia.js"
import Medium from "../../assets/javascripts/medium.js"
import Quora from "../../assets/javascripts/quora.js"
import Imdb from "../../assets/javascripts/imdb.js"
import Reuters from "../../assets/javascripts/reuters.js"
import Imgur from "../../assets/javascripts/imgur.js"
import Tiktok from "../../assets/javascripts/tiktok.js"
import SendTargets from "../../assets/javascripts/sendTargets.js"
import Peertube from "../../assets/javascripts/peertube.js"
import Lbry from "../../assets/javascripts/lbry.js"

window.browser = window.browser || window.chrome

// browser.runtime.onInstalled.addListener(details => {
// 	function initDefaults() {
// 		fetch("/instances/blacklist.json")
// 			.then(response => response.text())
// 			.then(async data => {
// 				browser.storage.local.clear(() => {
// 					browser.storage.local.set({ cloudflareBlackList: JSON.parse(data).cloudflare }, () => {
// 						browser.storage.local.set({ authenticateBlackList: JSON.parse(data).authenticate }, () => {
// 							browser.storage.local.set({ offlineBlackList: JSON.parse(data).offline })
// 						})
// 					})
// 				})
// 			})
// 	}
// 	if (details.reason == "install") initDefaults()

// 	// if (details.reason == 'install' || (details.reason == "update" && details.previousVersion != browser.runtime.getManifest().version)) {
// 	//   if (details.reason == "update")
// 	//     browser.storage.local.get(null, r => {
// 	//       if (r.theme) {
// 	//         const old = encodeURIComponent(JSON.stringify(r))
// 	//         browser.tabs.create({ url: browser.runtime.getURL(`/pages/background/reset_warning.html?data=${old}`) });
// 	//       }
// 	//       initDefaults();
// 	//     })
// 	//   else initDefaults();
// 	// }
// })

let BYPASSTABs = []
browser.webRequest.onBeforeRequest.addListener(
	details => {
		const url = new URL(details.url)
		if (new RegExp(/^chrome-extension:\/{2}.*\/instances\/.*.json$/).test(url.href) && details.type == "xmlhttprequest") return
		let initiator
		try {
			if (details.originUrl) initiator = new URL(details.originUrl)
			else if (details.initiator) initiator = new URL(details.initiator)
		} catch {
			return null
		}

		let newUrl
		for (const frontend of [Youtube, YoutubeMusic, Twitter, Instagram, Reddit, Search, Translate, Maps, Wikipedia, Medium, Quora, Imdb, Reuters, Imgur, Tiktok, SendTargets, Peertube, Lbry]) {
			if (!newUrl) newUrl = frontend.redirect(url, details.type, initiator)
		}

		if (details.frameAncestors && details.frameAncestors.length > 0 && generalHelper.isException(new URL(details.frameAncestors[0].url))) newUrl = null

		if (generalHelper.isException(url)) newUrl = "BYPASSTAB"
		if (BYPASSTABs.includes(details.tabId)) newUrl = null

		if (newUrl) {
			if (newUrl === "CANCEL") {
				console.log(`Canceled ${url}`)
				return { cancel: true }
			}
			if (newUrl === "BYPASSTAB") {
				console.log(`Bypassed ${details.tabId} ${url}`)
				if (!BYPASSTABs.includes(details.tabId)) BYPASSTABs.push(details.tabId)
				return null
			}
			console.info("Redirecting", url.href, "=>", newUrl)
			return { redirectUrl: newUrl }
		}
		return null
	},
	{ urls: ["<all_urls>"] },
	["blocking"]
)

browser.tabs.onRemoved.addListener(tabId => {
	const i = BYPASSTABs.indexOf(tabId)
	if (i > -1) {
		BYPASSTABs.splice(i, 1)
		console.log("Removed BYPASSTABs", tabId)
	}
})

browser.webRequest.onHeadersReceived.addListener(
	e => {
		let response = youtubeHelper.removeXFrameOptions(e)
		if (!response) response = twitterHelper.removeXFrameOptions(e)
		return response
	},
	{ urls: ["<all_urls>"] },
	["blocking", "responseHeaders"]
)

browser.commands.onCommand.addListener(command => {
	if (command === "switchInstance") utils.switchInstance()
	else if (command == "copyRaw") utils.copyRaw()
	else if (command == "unify") utils.unify()
})

browser.contextMenus.create({
	id: "settings",
	title: browser.i18n.getMessage("Settings"),
	contexts: ["browser_action"],
})

browser.contextMenus.create({
	id: "switchInstance",
	title: browser.i18n.getMessage("switchInstance"),
	contexts: ["browser_action"],
})

browser.contextMenus.create({
	id: "copyRaw",
	title: browser.i18n.getMessage("copyRaw"),
	contexts: ["browser_action"],
})

browser.contextMenus.create({
	id: "unify",
	title: browser.i18n.getMessage("unifySettings"),
	contexts: ["browser_action"],
})

browser.contextMenus.onClicked.addListener(info => {
	if (info.menuItemId == "switchInstance") utils.switchInstance()
	else if (info.menuItemId == "settings") browser.runtime.openOptionsPage()
	else if (info.menuItemId == "copyRaw") utils.copyRaw()
	else if (info.menuItemId == "unify") utils.unify()
})

browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.function === "unify") utils.unify(false).then(r => sendResponse({ response: r }))
	return true
})

browser.storage.local.set({ version: browser.runtime.getManifest().version })
