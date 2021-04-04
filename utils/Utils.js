class Utils {
    static createId(length = 6, chars = "abcdefghijklmnopqrstuvwxyz1234567890") {
        let result = "";

        for (let i = 0; i < length; i++)
            result += chars[(Math.random() * chars.length) | 0];

        return result;
    }

    static getVideoId(url) {
        url = url.split(" ").join(""); // remove spaces

        if (!this.isValidHttpUrl(url))
            return;

        const hostname = new URL(url).hostname.replace("www.", "");

        if (hostname === "youtube.com" || hostname === "youtu.be") {
            if (hostname === "youtube.com")
                return new URL(url).search.replace("?v=", "");
            if (hostname === "youtu.be")
                return new URL(url).pathname.replace("/", "");
        }

        // Wasn't a youtube url
        return;
    }

    static isValidYoutubeURL(url) {
        return this.getVideoId(url) != null;
    }

    static isValidHttpUrl(string) {
        let url;

        try {
            url = new URL(string);
        } catch (_) {
            return false;
        }

        return url.protocol === "http:" || url.protocol === "https:";
    }
}

module.exports = Utils;