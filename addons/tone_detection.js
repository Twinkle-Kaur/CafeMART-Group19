
'use strict';

var Promise = require('bluebird');

var PRIMARY_EMOTION_SCORE_THRESHOLD = 0.5;
var LANGUAGE_HIGH_SCORE_THRESHOLD = 0.75;
var LANGUAGE_NO_SCORE_THRESHOLD = 0.0;
var SOCIAL_HIGH_SCORE_THRESHOLD = 0.75;
var SOCIAL_LOW_SCORE_THRESHOLD = 0.25;


var EMOTION_TONE_LABEL = 'emotion_tone';
var LANGUAGE_TONE_LABEL = 'language_tone';
var SOCIAL_TONE_LABEL = 'social_tone';


module.exports = {
  updateUserTone: updateUserTone,
  invokeToneAsync: invokeToneAsync,
  initUser: initUser
};
function invokeToneAsync(conversationPayload, toneAnalyzer) {
  if (!conversationPayload.input || !conversationPayload.input.text || conversationPayload.input.text.trim() == '')
    conversationPayload.input.text = '<empty>';
  return new Promise(function(resolve, reject) {
    toneAnalyzer.tone({
      text: conversationPayload.input.text
    }, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
}


function updateUserTone(conversationPayload, toneAnalyzerPayload, maintainHistory) {
  var emotionTone = null;
  var languageTone = null;
  var socialTone = null;

  if (!conversationPayload.context) {
    conversationPayload.context = {};
  }

  if (!conversationPayload.context.user) {
    conversationPayload.context.user = initUser();
  }
  var user = conversationPayload.context.user;

  
  if (toneAnalyzerPayload && toneAnalyzerPayload.document_tone) {
    toneAnalyzerPayload.document_tone.tone_categories.forEach(function(toneCategory) {
      if (toneCategory.category_id === EMOTION_TONE_LABEL) {
        emotionTone = toneCategory;
      }
      if (toneCategory.category_id === LANGUAGE_TONE_LABEL) {
        languageTone = toneCategory;
      }
      if (toneCategory.category_id === SOCIAL_TONE_LABEL) {
        socialTone = toneCategory;
      }
    });

    updateEmotionTone(user, emotionTone, maintainHistory);
    updateLanguageTone(user, languageTone, maintainHistory);
    updateSocialTone(user, socialTone, maintainHistory);
  }
  conversationPayload.context.user = user;
  return conversationPayload;
}

/**
 * initToneContext initializes a user object containing tone data (from the
 * Watson Tone Analyzer)
 *
 * @returns {Json} user json object with the emotion, language and social tones.
 *          The current tone identifies the tone for a specific conversation
 *          turn, and the history provides the conversation for all tones up to
 *          the current tone for a conversation instance with a user.
 */
function initUser() {
  return ({
    'tone': {
      'emotion': {
        'current': null
      },
      'language': {
        'current': null
      },
      'social': {
        'current': null
      }
    }
  });
}


function updateEmotionTone(user, emotionTone, maintainHistory) {
  var maxScore = 0.0;
  var primaryEmotion = null;
  var primaryEmotionScore = null;

  emotionTone.tones.forEach(function(tone) {
    if (tone.score > maxScore) {
      maxScore = tone.score;
      primaryEmotion = tone.tone_name.toLowerCase();
      primaryEmotionScore = tone.score;
    }
  });

  if (maxScore <= PRIMARY_EMOTION_SCORE_THRESHOLD) {
    primaryEmotion = 'neutral';
    primaryEmotionScore = null;
  }
  // update user emotion tone
  user.tone.emotion.current = primaryEmotion;

  if (maintainHistory) {
    if (typeof user.tone.emotion.history === 'undefined') {
      user.tone.emotion.history = [];
    }

    user.tone.emotion.history.push({'tone_name': primaryEmotion, 'score': primaryEmotionScore});
  }
}


function updateLanguageTone(user, languageTone, maintainHistory) {
  var currentLanguage = [];
  var currentLanguageObject = [];

  
  languageTone.tones.forEach(function(tone) {
    if (tone.score >= LANGUAGE_HIGH_SCORE_THRESHOLD) {
      currentLanguage.push(tone.tone_name.toLowerCase() + '_high');
      currentLanguageObject.push({'tone_name': tone.tone_name.toLowerCase(), 'score': tone.score, 'interpretation': 'likely high'});
    } else if (tone.score <= LANGUAGE_NO_SCORE_THRESHOLD) {
      currentLanguageObject.push({'tone_name': tone.tone_name.toLowerCase(), 'score': tone.score, 'interpretation': 'no evidence'});
    } else {
      currentLanguageObject.push({'tone_name': tone.tone_name.toLowerCase(), 'score': tone.score, 'interpretation': 'likely medium'});
    }
  });

  
  user.tone.language.current = currentLanguage;

  if (maintainHistory) {
    if (typeof user.tone.language.history === 'undefined') {
      user.tone.language.history = [];
    }

    user.tone.language.history.push(currentLanguageObject);
  }
}


function updateSocialTone(user, socialTone, maintainHistory) {
  var currentSocial = [];
  var currentSocialObject = [];

  
  socialTone.tones.forEach(function(tone) {
    if (tone.score >= SOCIAL_HIGH_SCORE_THRESHOLD) {
      currentSocial.push(tone.tone_name.toLowerCase() + '_high');
      currentSocialObject.push({'tone_name': tone.tone_name.toLowerCase(), 'score': tone.score, 'interpretation': 'likely high'});
    } else if (tone.score <= SOCIAL_LOW_SCORE_THRESHOLD) {
      currentSocial.push(tone.tone_name.toLowerCase() + '_low');
      currentSocialObject.push({'tone_name': tone.tone_name.toLowerCase(), 'score': tone.score, 'interpretation': 'likely low'});
    } else {
      currentSocialObject.push({'tone_name': tone.tone_name.toLowerCase(), 'score': tone.score, 'interpretation': 'likely medium'});
    }
  });

    user.tone.social.current = currentSocial;

  if (maintainHistory) {
    if (typeof user.tone.social.history === 'undefined') {
      user.tone.social.history = [];
    }

    user.tone.social.history.push(currentSocialObject);
  }
}
