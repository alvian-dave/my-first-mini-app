// /src/lib/twitter.ts
import SocialAccount from "@/models/SocialAccount"

const BOT_AUTH_TOKEN = process.env.TWITTER_BOT_AUTH_TOKEN!
const BOT_CSRF = process.env.TWITTER_BOT_CSRF!
const BOT_BEARER = process.env.TWITTER_BOT_BEARER!

// ─────────────────────────────
// Headers
// ─────────────────────────────
function botHeaders() {
  return {
    Authorization: `Bearer ${BOT_BEARER}`,
    Cookie: `auth_token=${BOT_AUTH_TOKEN}; ct0=${BOT_CSRF}`,
    "x-csrf-token": BOT_CSRF,
  }
}

// Header khusus untuk resolve username -> userId
export function resHeaders() {
  return {
    Authorization: `Bearer ${BOT_BEARER}`,
    "x-csrf-token": BOT_CSRF,
    Cookie: `auth_token=${BOT_AUTH_TOKEN}; ct0=${BOT_CSRF}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
  }
}

// Header khusus untuk cek Like
export function likeHeaders(tweetId: string) {
  return {
    Authorization: `Bearer ${BOT_BEARER}`,
    "x-csrf-token": BOT_CSRF,
    Cookie: `auth_token=${BOT_AUTH_TOKEN}; ct0=${BOT_CSRF}`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    "x-twitter-active-user": "yes",
    "x-twitter-client-language": "en",
    Referer: `https://x.com/i/web/status/${tweetId}`,
  }
}

// Header khusus untuk cek Retweet
export function retwHeaders(tweetId: string) {
  return {
    accept: "*/*",
    Authorization: `Bearer ${BOT_BEARER}`,
    "Content-Type": "application/json",
    Cookie: `auth_token=${BOT_AUTH_TOKEN}; ct0=${BOT_CSRF}`,
    "x-csrf-token": BOT_CSRF,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    "x-twitter-active-user": "yes",
    "x-twitter-auth-type": "OAuth2Session",
    "x-twitter-client-language": "en",
    Referer: `https://x.com/i/web/status/${tweetId}`,
  }
}

// ─────────────────────────────
// Resolve userId dari username
// ─────────────────────────────
export async function resolveTwitterUserId(username: string): Promise<string | null> {
  const clean = username
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\//, "")
    .replace(/\/+$/, "")
    .split(/[/?]/)[0]
    .toLowerCase()

  const queryId = "96tVxbPqMZDoYB5pmzezKA" // UserByScreenName
  const url = `https://x.com/i/api/graphql/${queryId}/UserByScreenName?variables=${encodeURIComponent(
    JSON.stringify({ screen_name: clean, withGrokTranslatedBio: false })
  )}&features=${encodeURIComponent(
    JSON.stringify({
      hidden_profile_subscriptions_enabled: true,
      payments_enabled: false,
      profile_label_improvements_pcf_label_in_post_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      verified_phone_label_enabled: false,
      subscriptions_verification_info_is_identity_verified_enabled: true,
      subscriptions_verification_info_verified_since_enabled: true,
      highlights_tweets_tab_ui_enabled: true,
      responsive_web_twitter_article_notes_tab_enabled: true,
      subscriptions_feature_can_gift_premium: true,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      responsive_web_graphql_timeline_navigation_enabled: true,
    })
  )}&fieldToggles=${encodeURIComponent(
    JSON.stringify({ withAuxiliaryUserLabels: true })
  )}`

  try {
    const res = await fetch(url, {
      headers: {
        ...resHeaders(),
        referer: `https://x.com/${clean}`,
      },
    })
    if (!res.ok) {
      console.error("resolveTwitterUserId failed:", clean, res.status, await res.text())
      return null
    }
    const json = await res.json().catch(() => null)
    return json?.data?.user?.result?.rest_id ?? null
  } catch (e) {
    console.error("resolveTwitterUserId error:", e)
    return null
  }
}

// ─────────────────────────────
// Check hunter follow target
// ─────────────────────────────
export async function checkTwitterFollow(social: any, targetId: string): Promise<boolean> {
  try {
    const sourceId = social.socialId
    const url = `https://api.twitter.com/1.1/friendships/show.json?source_id=${sourceId}&target_id=${targetId}`
    const res = await fetch(url, { headers: botHeaders() })
    if (!res.ok) {
      console.error("checkTwitterFollow failed:", res.status, await res.text())
      return false
    }
    const json = await res.json().catch(() => null)
    return json?.relationship?.source?.following === true
  } catch (e) {
    console.error("checkTwitterFollow error:", e)
    return false
  }
}

// ─────────────────────────────
// Check hunter like tweet
// ─────────────────────────────
export async function checkTwitterLike(userId: string, tweetId: string): Promise<boolean> {
  const queryId = "LJcJgGhFdz9zGTu13IlSBA" // Favoriters
  const url = `https://x.com/i/api/graphql/${queryId}/Favoriters?variables=${encodeURIComponent(
    JSON.stringify({ tweetId, count: 20, includePromotedContent: true })
  )}&features=${encodeURIComponent(
    JSON.stringify({
      rweb_video_screen_enabled: false,
      payments_enabled: false,
      profile_label_improvements_pcf_label_in_post_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      verified_phone_label_enabled: false,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      premium_content_api_read_enabled: false,
      communities_web_enable_tweet_community_results_fetch: true,
      c9s_tweet_anatomy_moderator_badge_enabled: true,
      responsive_web_grok_analyze_button_fetch_trends_enabled: false,
      responsive_web_grok_analyze_post_followups_enabled: true,
      responsive_web_jetfuel_frame: true,
      responsive_web_grok_share_attachment_enabled: true,
      articles_preview_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      tweet_awards_web_tipping_enabled: false,
      responsive_web_grok_show_grok_translated_post: false,
      responsive_web_grok_analysis_button_from_backend: true,
      creator_subscriptions_quote_tweet_preview_enabled: false,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: true,
      responsive_web_grok_image_annotation_enabled: true,
      responsive_web_grok_imagine_annotation_enabled: true,
      responsive_web_grok_community_note_auto_translation_is_enabled: false,
      responsive_web_enhance_cards_enabled: false,
    })
  )}`

  try {
    const res = await fetch(url, {
      headers: {
        ...likeHeaders(),
        referer: `https://x.com/i/status/${tweetId}/likes`,
      },
    })
    if (!res.ok) {
      console.error("checkTwitterLike failed:", res.status, await res.text())
      return false
    }
    const json = await res.json().catch(() => null)
    const users =
      json?.data?.favoriters_timeline?.timeline?.instructions
        ?.flatMap((i: any) => i.entries ?? [])
        ?.flatMap((e: any) =>
          e.content?.itemContent?.user_results ? [e.content.itemContent.user_results.result] : []
        ) ?? []

    return users.some((u: any) => u?.rest_id === userId)
  } catch (e) {
    console.error("checkTwitterLike error:", e)
    return false
  }
}

// ─────────────────────────────
// Check hunter retweet tweet
// ─────────────────────────────
export async function checkTwitterRetweet(userId: string, tweetId: string): Promise<boolean> {
  const queryId = "pORrqerSnuFMTRxQ-YRPLA" // Retweeters
  const url = `https://x.com/i/api/graphql/${queryId}/Retweeters?variables=${encodeURIComponent(
    JSON.stringify({ tweetId, count: 20 })
  )}&features=${encodeURIComponent(
    JSON.stringify({
      rweb_video_screen_enabled: false,
      payments_enabled: false,
      profile_label_improvements_pcf_label_in_post_enabled: true,
      rweb_tipjar_consumption_enabled: true,
      verified_phone_label_enabled: false,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      premium_content_api_read_enabled: false,
      communities_web_enable_tweet_community_results_fetch: true,
      c9s_tweet_anatomy_moderator_badge_enabled: true,
      responsive_web_grok_analyze_button_fetch_trends_enabled: false,
      responsive_web_grok_analyze_post_followups_enabled: true,
      responsive_web_jetfuel_frame: true,
      responsive_web_grok_share_attachment_enabled: true,
      articles_preview_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      tweet_awards_web_tipping_enabled: false,
      responsive_web_grok_show_grok_translated_post: false,
      responsive_web_grok_analysis_button_from_backend: true,
      creator_subscriptions_quote_tweet_preview_enabled: false,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: true,
      responsive_web_grok_image_annotation_enabled: true,
      responsive_web_grok_imagine_annotation_enabled: true,
      responsive_web_grok_community_note_auto_translation_is_enabled: false,
      responsive_web_enhance_cards_enabled: false,
    })
  )}`

  try {
    const res = await fetch(url, {
      headers: {
        ...retwHeaders(),
        referer: `https://x.com/i/status/${tweetId}/retweets`,
      },
    })
    if (!res.ok) {
      console.error("checkTwitterRetweet failed:", res.status, await res.text())
      return false
    }
    const json = await res.json().catch(() => null)
    const users =
      json?.data?.retweeters_timeline?.timeline?.instructions
        ?.flatMap((i: any) => i.entries ?? [])
        ?.flatMap((e: any) =>
          e.content?.itemContent?.user_results ? [e.content.itemContent.user_results.result] : []
        ) ?? []

    return users.some((u: any) => u?.rest_id === userId)
  } catch (e) {
    console.error("checkTwitterRetweet error:", e)
    return false
  }
}