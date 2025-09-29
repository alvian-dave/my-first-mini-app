import fetch from "node-fetch";
import { fileURLToPath } from "url";

// 🔑 Token & cookie (pakai punya lo yang valid)
const AUTH_BEARER =
  "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs=1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const CSRF_TOKEN =
  "c7221c7b45aefdd8e198b2479ca3cb0a0e6b82d0e6a79a7e6cde61697fdfc630d860e10d2b92b26749a2966d534e97c8e4a6f6f30a8775f2c855fa3ad055fa036d823c802a90974b3f8c16389c6b3502";
const COOKIE = `auth_token=768bd7a0ba6de3ecad8c0bdcbecfab84ba5dfcf7; ct0=${CSRF_TOKEN}`;

/**
 * ✅ Cek apakah userId sudah like tweetId
 */
export async function checkTwitterLike(userId, tweetId) {
  const url = `https://x.com/i/api/graphql/LJcJgGhFdz9zGTu13IlSBA/Favoriters?variables=${encodeURIComponent(
    JSON.stringify({
      tweetId,
      count: 20,
      enableRanking: true,
      includePromotedContent: true,
    })
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
  )}`;

  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${AUTH_BEARER}`,
      "x-csrf-token": CSRF_TOKEN,
      cookie: COOKIE,
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en",
      referer: `https://x.com/i/web/status/${tweetId}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Request failed ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();

  const entries =
    data?.data?.favoriters_timeline?.timeline?.instructions?.flatMap(
      (i) => i.entries || []
    ) || [];

  const users = entries
    .filter((e) => e?.content?.itemContent?.itemType === "TimelineUser")
    .map((e) => e.content.itemContent.user_results.result.rest_id);

  return users.includes(userId); // ⬅️ true/false
}

