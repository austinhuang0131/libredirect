"use strict"
window.browser = window.browser || window.chrome

import Youtube from "../../assets/javascripts/youtube/youtube.js"
import YoutubeMusic from "../../assets/javascripts/youtubeMusic.js"
import Twitter from "../../assets/javascripts/twitter.js"
import Instagram from "../../assets/javascripts/instagram.js"
import Reddit from "../../assets/javascripts/reddit.js"
import Search from "../../assets/javascripts/search.js"
import Translate from "../../assets/javascripts/translate/translate.js"
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

for (const a of document.getElementById("links").getElementsByTagName("a")) {
	a.addEventListener("click", e => {
		const path = a.getAttribute("href").replace("#", "")
		loadPage(path)
		e.preventDefault()
	})
}

function loadPage(path) {
	for (const section of document.getElementById("pages").getElementsByTagName("section")) section.style.display = "none"
	document.getElementById(`${path}_page`).style.display = "block"

	for (const a of document.getElementById("links").getElementsByTagName("a"))
		if (a.getAttribute("href") == `#${path}`) a.classList.add("selected")
		else a.classList.remove("selected")

	let stateObj = { id: "100" }
	window.history.pushState(stateObj, "Page 2", `/pages/options/index.html#${path}`)
}

const r = window.location.href.match(/#(.*)/)
if (r) loadPage(r[1])
else loadPage("general")

const frontends = [Youtube, YoutubeMusic, Twitter, Instagram, Reddit, Search, Translate, Maps, Wikipedia, Medium, Quora, Imdb, Reuters, Imgur, Tiktok, SendTargets, Peertube, Lbry]

for (const frontend of frontends) {
	const page = document.getElementById(`${frontned.name}_page`)
	const button = document.getElementById(`${frontend.name}-enable`)

	button.addEventListener("change", () => {
		frontend.enable = button.checked
	})
}
