"use strict"
window.browser = window.browser || window.chrome

import utils from "../../assets/javascripts/utils.js"
import generalHelper from "../../assets/javascripts/general.js"

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

const frontends = [Youtube, YoutubeMusic, Twitter, Instagram, Reddit, Search, Translate, Maps, Wikipedia, Medium, Quora, Imdb, Reuters, Imgur, Tiktok, SendTargets, Peertube, Lbry]

utils.unify(true).then(r => {
	if (!r) document.getElementById("unify_div").style.display = "none"
	else {
		const unify = document.getElementById("unify")
		const textElement = document.getElementById("unify").getElementsByTagName("h4")[0]
		unify.addEventListener("click", () => {
			const oldHtml = textElement.innerHTML
			textElement.innerHTML = "..."
			browser.runtime.sendMessage({ function: "unify" }, response => {
				if (response && response.response) textElement.innerHTML = oldHtml
			})
		})
	}
})

utils.switchInstance(true).then(r => {
	if (!r) document.getElementById("change_instance_div").style.display = "none"
	else document.getElementById("change_instance").addEventListener("click", () => utils.switchInstance(false))
})

utils.copyRaw(true).then(r => {
	if (!r) document.getElementById("copy_raw_div").style.display = "none"
	else {
		const copy_raw = document.getElementById("copy_raw")
		copy_raw.addEventListener("click", () => utils.copyRaw(false, copy_raw))
	}
})
document.getElementById("more-options").addEventListener("click", () => browser.runtime.openOptionsPage())

const allSites = document.getElementsByClassName("all_sites")[0]
const currSite = document.getElementsByClassName("current_site")[0]

const currentSiteIsFrontend = document.getElementById("current_site_divider")

const allElement = name => allSites.getElementsByClassName(`disable-${name}`)[0]
const curentElement = name => currSite.getElementsByClassName(`disable-${name}`)[0]

browser.tabs.query({ active: true, currentWindow: true }, async tabs => {
	for (const frontend of generalHelper.allPopupFrontends) {
		if (!r.popupFrontends.includes(frontend)) allElement(frontend.name).classList.add("hide")
		else allElement(frontend.name).classList.remove("hide")
		curentElement(frontend.name).classList.add("hide")
	}

	let url
	try {
		url = new URL(tabs[0].url)
	} catch {
		currentSiteIsFrontend.classList.add("hide")
		return
	}

	let isTrue
	for (const frontend of frontends) {
		if (frontend.redirect(url, "main_frame", false, true) || frontend.switch(url, "main_frame", false, true)) {
			curentElement(frontend.name).classList.remove("hide")
			allElement(frontend.name).classList.add("hide")
			isTrue = true
			break
		}
	}
	if (!isTrue) currentSiteIsFrontend.classList.add("hide")
})

for (const frontend of frontends) {
	allElement(frontend.name).checked = frontend.enable
	curentElement(frontend.name).checked = frontend.enable

	curentElement(frontend.name).addEventListener("change", () => frontend.setEnable(curentElement(frontend.name).checked))
	allElement(frontend.name).addEventListener("change", () => frontend.setEnable(allElement(frontend.name).checked))
}

for (const a of document.getElementsByTagName("a")) {
	a.addEventListener("click", e => {
		if (!a.classList.contains("prevent")) {
			browser.tabs.create({ url: a.getAttribute("href") })
			e.preventDefault()
		}
	})
}
