import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  buildYouTubeMetadataUrl,
  buildYouTubeProcessUrl,
  buildYouTubeProcessStreamUrl,
  ERROR_MESSAGES,
  extractVideoId,
} from '@scorelytic/shared';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import styles from './YouTubeProcessor.module.css';

interface YouTubeProcessorProps {
  onProcessComplete?: (result: any) => void;
}

const YouTubeMetaCard = ({ meta, videoId, showVideo, setShowVideo }: any) => (
  <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '656px',
        background: '#000',
        overflow: 'hidden',
      }}
    >
      {showVideo ? (
        <iframe
          width="100%"
          height="100%"
          src={`https://www.youtube.com/embed/${extractVideoId(videoId.trim())}`}
          title={meta.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: '100%', height: '100%' }}
        />
      ) : (
        <>
          <Image
            src={
              meta.thumbnails?.maxres?.url ||
              meta.thumbnails?.high?.url ||
              meta.thumbnails?.default?.url
            }
            alt={meta.title}
            width={1920}
            height={1080}
            style={{ objectFit: 'cover', width: '100%', height: '656px' }}
            className="border-b"
          />
          <button
            onClick={() => setShowVideo(true)}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0,0,0,0.6)',
              border: 'none',
              borderRadius: '50%',
              width: 72,
              height: 72,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 8px #0003',
            }}
            aria-label="Play video"
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="20" cy="20" r="20" fill="rgba(255,255,255,0.85)" />
              <polygon points="16,12 30,20 16,28" fill="#a18aff" />
            </svg>
          </button>
        </>
      )}
    </div>
    <div className="p-6">
      <a
        className="text-2xl font-bold text-gray-900 mb-2"
        href={`https://www.youtube.com/watch?v=${extractVideoId(videoId.trim())}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {meta.title}
      </a>
      <div className="flex items-center gap-3 mb-2">
        {meta.channelId ? (
          <a
            href={`https://www.youtube.com/channel/${meta.channelId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base text-gray-700 font-semibold hover:underline"
          >
            {meta.channelTitle}
          </a>
        ) : (
          <a
            href={`https://www.youtube.com/channel/${meta.channelId}`}
            className="text-base text-gray-700 font-semibold"
          >
            {meta.channelTitle}
          </a>
        )}
        {meta.channelId && (
          <a
            href={`https://www.youtube.com/channel/${meta.channelId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <button className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow hover:bg-red-700 transition">
              Subscribe
            </button>
          </a>
        )}
      </div>
      {meta.publishedAt && (
        <div className="text-xs text-gray-500 mb-4">
          {new Date(meta.publishedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </div>
      )}
      {meta.description && (
        <div
          className="text-sm text-gray-800 whitespace-pre-line mb-4"
          style={{ lineHeight: '1.6' }}
        >
          {meta.description}
        </div>
      )}
      {meta.tags && meta.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {meta.tags.map((tag: string) => (
            <span
              key={tag}
              className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-xs font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  </div>
);

export default function YouTubeProcessor({ onProcessComplete }: YouTubeProcessorProps) {
  const [videoId, setVideoId] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [useStreaming, setUseStreaming] = useState(true);
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [generalAnalysis, setGeneralAnalysis] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const stepsSet = useRef<Set<string>>(new Set());
  const resultRef = useRef<HTMLDivElement>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const fullResult = { ...result, ...(result?.data || {}) };
  const isGeneralAnalysis = !!fullResult.summary && Array.isArray(fullResult.keyNotes);
  const transcript = fullResult.transcript;
  const transcriptError =
    typeof fullResult.transcriptError === 'string' ? fullResult.transcriptError.trim() : '';
  const isTranscriptOk = typeof transcript === 'string' && transcript.trim().length > 0;
  const hasTranscriptError = !!transcriptError && !isTranscriptOk;
  const sentiment = fullResult.sentiment;
  const isTrulySuccess = isGeneralAnalysis
    ? isTranscriptOk && !transcriptError
    : !!sentiment && isTranscriptOk && !error;

  useEffect(() => {
    if (progressLogs.length > 0) {
      const last = progressLogs[progressLogs.length - 1];
      setSteps((prev) => (prev.includes(last) ? prev : [...prev, last]));
      setCurrentStep(steps.length > 0 ? steps.length - 1 : 0);
    }
  }, [progressLogs, steps.length]);

  useEffect(() => {
    const target = steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0;
    if (isTrulySuccess && progress < 100) {
      setProgress(100);
      return;
    }
    if (progress < target) {
      const interval = setInterval(() => {
        setProgress((p) => Math.min(target, p + 1));
      }, 10);
      return () => clearInterval(interval);
    }
  }, [currentStep, progress, steps.length, isTrulySuccess]);

  useEffect(() => {
    if (result) setIsSuccess(true);
    if (error) setIsSuccess(false);
  }, [result, error]);

  useEffect(() => {
    setProgressLogs([]);
    setCurrentStep(0);
    setProgress(0);
    setIsSuccess(false);
    setResult(null);
    setError(null);
  }, [videoId]);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [result]);

  useEffect(() => {
    if (isTrulySuccess && steps.length > 0 && steps[steps.length - 1] !== 'Success!') {
      setSteps((prev) => [...prev, 'Success!']);
    }
  }, [isTrulySuccess, steps]);

  useEffect(() => {
    setShowDetails(false);
    setShowVideo(false);
  }, [result]);

  const resetProgress = () => {
    setProgressLogs([]);
    setSteps([]);
    stepsSet.current = new Set();
    setCurrentStep(0);
    setProgress(0);
    setIsSuccess(false);
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    const extractedId = extractVideoId(videoId.trim());
    if (!extractedId) {
      setError(ERROR_MESSAGES.YOUTUBE.INVALID_ID);
      return;
    }
    setProcessing(true);
    resetProgress();
    if (useStreaming) {
      // Always fetch metadata in parallel
      const metaPromise = fetch(buildYouTubeMetadataUrl(extractedId))
        .then((r) => r.json())
        .catch(() => null);
      // SSE mode
      const url = buildYouTubeProcessStreamUrl(extractedId, generalAnalysis);
      const es = new window.EventSource(url);
      eventSourceRef.current = es;
      es.onmessage = async (event) => {
        // Default event
        const msg = event.data;
        setProgressLogs((logs) => [...logs, msg]);
        if (!stepsSet.current.has(msg)) {
          stepsSet.current.add(msg);
          setSteps((prev) => [...prev, msg]);
        }
        setCurrentStep(Array.from(stepsSet.current).indexOf(msg));
      };
      es.addEventListener('progress', (event) => {
        const { message } = JSON.parse(event.data);
        setProgressLogs((logs) => [...logs, message]);
        if (!stepsSet.current.has(message)) {
          stepsSet.current.add(message);
          setSteps((prev) => [...prev, message]);
        }
        setCurrentStep(Array.from(stepsSet.current).indexOf(message));
      });
      es.addEventListener('result', async (event) => {
        const resultData = JSON.parse(event.data);
        const metaData = await metaPromise;
        const merged = { ...resultData, metadata: metaData };
        setResult(merged);
        onProcessComplete?.(merged);
        es.close();
        setProcessing(false);
        setIsSuccess(true);
        setProgress(100);
      });
      es.addEventListener('error', (event) => {
        setError('Streaming error');
        es.close();
        setProcessing(false);
        setIsSuccess(false);
      });
    } else {
      // Regular POST mode with parallel metadata fetch
      try {
        const metaPromise = fetch(buildYouTubeMetadataUrl(extractedId))
          .then((r) => r.json())
          .catch(() => null);
        const [processRes, metaData] = await Promise.all([
          fetch(buildYouTubeProcessUrl(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: extractedId, generalAnalysis }),
          }).then((r) => r.json()),
          metaPromise,
        ]);
        // Always flatten: if processRes.data exists, use it, else use processRes
        const merged = { ...(processRes.data || processRes), metadata: metaData };
        setResult(merged);
        onProcessComplete?.(merged);
        setIsSuccess(true);
      } catch (err: any) {
        setError(err.message || ERROR_MESSAGES.YOUTUBE.PROCESS_FAILED);
        setIsSuccess(false);
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleGetMetadata = async () => {
    const extractedId = extractVideoId(videoId.trim());
    if (!extractedId) {
      setError(ERROR_MESSAGES.YOUTUBE.INVALID_ID);
      return;
    }

    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(buildYouTubeMetadataUrl(extractedId));
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || ERROR_MESSAGES.YOUTUBE.FETCH_FAILED);
      }

      setResult({ metadata: data });
    } catch (err: any) {
      setError(err.message || ERROR_MESSAGES.YOUTUBE.FETCH_FAILED);
    } finally {
      setProcessing(false);
    }
  };

  // DEMO BUTTON HANDLER (Mario Wonder)
  const handleDemoLLMAnalysisMario = () => {
    setProcessing(true);
    setError(null);
    setTimeout(() => {
      setResult({
        data: {
          metadata: {
            title: 'Super Mario Bros. Wonder Review',
            channelTitle: 'IGN',
            channelId: 'UCKy1dAqELo0zrOtPkf0eTMw',
            publishedAt: '2023-10-18T13:00:23Z',
            description:
              "Super Mario Bros. Wonder looks and plays like the true next step for 2D Mario platformers that it aims to be. The Wonder effects change each stage in both surprising and delightful ways, and the Flower Kingdom makes for a vibrant and refreshing change of pace from the Mushroom Kingdom. With apologies to Yoshi's Island, Wonder feels like a proper 21st-century follow-up to Super Mario World. Reviewed on Nintendo Switch by Ryan McCaffrey.\n\nNeed some help tracking down all the collectibles in Super Mario Bros. Wonder? Check out our handy guides here:\nWalkthrough - https://www.ign.com/wikis/super-mario-bros-wonder/Walkthrough\nBig Flower Coins - https://www.ign.com/wikis/super-mario-bros-wonder/Flower_Coin_Locations\nSecret Exits - https://www.ign.com/wikis/super-mario-bros-wonder/All_Secret_Exits_and_Hidden_Wonder_Seeds\n\n#IGN #Gaming #SuperMarioWonder",
            thumbnails: {
              default: {
                url: 'https://i.ytimg.com/vi/S8mbe6mF0js/default.jpg',
                width: 120,
                height: 90,
              },
              medium: {
                url: 'https://i.ytimg.com/vi/S8mbe6mF0js/mqdefault.jpg',
                width: 320,
                height: 180,
              },
              high: {
                url: 'https://i.ytimg.com/vi/S8mbe6mF0js/hqdefault.jpg',
                width: 480,
                height: 360,
              },
              standard: {
                url: 'https://i.ytimg.com/vi/S8mbe6mF0js/sddefault.jpg',
                width: 640,
                height: 480,
              },
              maxres: {
                url: 'https://i.ytimg.com/vi/S8mbe6mF0js/maxresdefault.jpg',
                width: 1280,
                height: 720,
              },
            },
            tags: [
              'game trailer',
              'game trailers',
              'trailer',
              'trailers',
              'gaming',
              'video games',
              'video game trailer',
              'video game trailers',
              'new game trailers',
              'new video game trailers',
              'upcoming video games',
              'new video games 2024',
              'upcoming video games 2024',
              'super mario wonder',
              'super mario wonder review',
              'ign super mario wonder review',
              'ign mario wonder review',
              'mario wonder review',
              'mario wonder review ign',
            ],
          },
          sentiment: {
            score: 9,
            sentimentScore: 9,
            summary:
              "The review praises 'Super Mario Bros. Wonder' for its vibrant and joyful presentation, innovative gameplay elements, and engaging multiplayer features. The game is noted for its colorful graphics, whimsical level design, and the introduction of badges that offer players strategic flexibility. The story is minimal but serves as a backdrop for creative level experiences.",
            verdict: 'positive',
            sentimentSummary: 'Overwhelmingly positive',
            biasIndicators: [],
            alsoRecommends: ["Yoshi's Island", 'Super Mario World', 'Super Mario Odyssey'],
            pros: [
              'Vibrant and colorful graphics',
              'Innovative level design with wonder effects',
              'Engaging multiplayer options',
              'Introduction of badges for strategic gameplay',
              'New and interesting enemies',
              'Creative and joyful atmosphere',
              'Innovative power-ups like Elephant Mario',
              'Unpredictable Wonder effects',
              'Includes a family-friendly character like Nabit',
            ],
            cons: [
              'Minimal story impact',
              'Some badges lack associated challenges',
              'Lacks challenging content for series veterans',
              'Music is forgettable',
            ],
            reviewSummary:
              'Super Mario Bros. Wonder is a delightful and visually stunning platformer that reinvents the Mario formula with imaginative level designs and engaging multiplayer features, making it a must-play for fans of the series.',
            biasDetection: {
              originalScore: 9,
              biasesDetected: [],
              reviewSummary:
                'Super Mario Bros. Wonder is a delightful and visually stunning platformer that reinvents the Mario formula with imaginative level designs and engaging multiplayer features, making it a must-play for fans of the series.',
            },
            biasAdjustment: {
              biasAdjustedScore: 9,
              totalScoreAdjustment: 0,
              rationale: 'No bias adjustment was made because no significant biases were detected.',
            },
            sentimentSnapshot: {
              inferredScore: 9,
              verdict: 'positive',
              confidenceLevel: 'high',
              recommendationStrength: 'strong',
            },
            culturalContext: {
              justification:
                'Based on the review transcript, certain ideological themes and narrative framings may influence audience perception.',
              ideologicalThemes: ['representation', 'studio reputation'],
              audienceReactions: {
                aligned:
                  'Likely to resonate strongly with fans of inclusive narratives and franchise loyalists.',
                neutral:
                  'May appreciate the technical and narrative strengths, but not be deeply moved.',
                opposed: 'Could be critical of perceived ideological or franchise-driven elements.',
              },
            },
          },
          transcript: `every single Mario platformer game 2D or 3D seems to gleefully reinvent itself to some degree doubling down on the unique Delights that they bring me love that sound continuing that Trend Super Mario Brothers wonder is very aptly named because quite simply it is full of wonder literally wonderful every frame oozes Joy from its bright colors to the flower Kingdom's ubiquitous talking flower H stretch who's never lacking in words of encouragement as you run and jump through dozens upon dozens of stages that are altered by unpredictable and often grin-inducing wonder effects and more often than not the antics of Mario himself whether you enjoy it Solo or with up to three friends there's a lot to love about Super Mario Brothers Wonder [Music] Wonder catches the eye immediately it dazzles due to its typical and welcome use of a wide variety of colors with a particular emphasis on Vivid Blues Reds greens and yellows but it's particularly impressive in motion with apologies to Yoshi's Island it looks like what you'd imagine a proper Super Mario World sequel should be if it were made in 2023 instead of 1995 Mario reaches back for his hat when he dashes into pipes Critter's eyes bulge in fear as they run in Terror from a pursuing plumber Goombas have snot bubbles on their nostrils as they nap elephant Mario squeezes his giant round body into warp pipes and awkwardly tries to make himself as small as he can when crouching under a low row of blocks there are so many more those touches go a long way toward bringing Mario's first trip to the flower Kingdom to life but what is the flower Kingdom it's a neighbor to the familiar Mushroom Kingdom and it proved to be a refreshing setting mostly because it brought so many new and unique enemies for Mario to stomp on story-wise you can already guess a visiting Mario finds himself caught up in another Bowser Caper of course as the reptile uses the land's Wonder powers to fuse himself with the Kingdom's primary Castle making life miserable for its inhabitants as always the story is Paper Mario thin and you know you're going to fight Bowser's junor along the [Music] way but it leaves no Cloud hanging over the flower Kingdom because the dozens of stages across six main worlds along with the petal Isles Hub that contains stages of its own offers so many different looks and wild hooks that the typically forgettable story simply didn't matter most levels include at least two w seeds with one of them at the end and another hidden somewhere within it getting access to that hidden seed usually involves finding a wonderf flower sometimes hidden in blocks bad guys or in secret areas that make something unexpected happen sadly I'm not allowed to show you most of the best ones but Mario might transform into a rolling spiky ball or the camera might shift to a top- down perspective or he might turn into a Goomba who can't jump or attack or there might be a dance party you just never know what will happen next and as such I looked forward to the Wonder effects on every stage there's so much fun to experience that if I missed one in a level I had plenty of motivation to run back in to find it in short the Wonders make the game go go it certainly doesn't hurt that each World packs entirely different groups of enemies that include mostly new foes but with some callbacks to both staple Classics like the cloud riding locky toos and deeper cut like the pokies from Super Mario Brothers 2 among the newbies the bull rushes come rushing at you and cannot be defeated by traditional stomping but they can be ridden which Wonder takes clever advantage of the Derpy looking M Ms meanwhile look sweet chill and innocent until they spot you at which point their gaping Ms open wide and will swallow you whole if you don't jump very high very quickly the Mumsy on the other hand pose little thread aside from their difficult to leap over height and I never got tired of grabbing onto their loose piece of cloth and unraveling them into Oblivion I hope we get to see the flower Kingdom again someday because I don't want this to be the only appearance for this fresh group of interesting new [Music] enemies another Wrinkle in the 2D Mario formula comes in the form of badges a group of roughly two dozen unlockable active or passive effects you can choose to take into each level grappling Vine means even Mario games have grappling hooks now safety bounce will let you survive a fall into lava and sensor pings more frequently as you get closer to key objects like large purple coins and crucially wonder flowers W these badges give you some welcome control over how you tackle stages in a way that best suits your play style not to mention offering a bit of replayability as a cherry on top some badges can be purchased at Shops While others are earned when you complete badge challenge stages designed around that particular PowerUp impressive by comparison buying a badge with purple coins was unsatisfying especially considering I was never short on them I wish each of them had a fun challenge associated with it instead of just some of [Music] them speak speaking of new additions Super Mario Brothers Wonder offers familiar four-player local and brand new online multiplayer with the online component being surprisingly seamlessly integrated I don't see it as appointment multiplayer gaming couch Co-op is still where it's at in any multiplayer Mario game but it works and the friend races you can initiate on most stages can be a fun distraction from the primary platforming action and whether you play on the same screen together or online it is nice to see Nintendo put forth a more concerted effort to make multiplayer feel like a more organic part of the platforming rather than attacked on afterthought through things like standees which let you leave respawn points for your friends and turning your pals into ghosts that won't physically get in your way during a precise jump or maneuver [Music] woohoo but let me Circle back to Elephant Mario for a second is he explained does he make any sense at all does it matter no is he awesome yes OWI he is a dominant shack-like force in Super Mario Brothers Wonder complete with absolutely hilarious animations a tap of the Y button sends smaller foes flying away when he swipes at them with his trunk he can hold water in said trunk too dousing hot blocks and watering thirsty plants where needed thank you his sheer bulk even allows him to smash bricks with his trunk he's just a blast drill Mario is also a welcome addition with a drill bit on his hat he can burrow into the ground or the ceiling to access hidden areas and spring up from Below on unsuspecting bad guys I can't quite say the same for bubble Mario he blows large bubbles that can snag coins slightly home in on and ins snare enemies and be used as jumping pads which is all useful enough but when given the choice of which Mario form I wanted to take just like in past Mario games you can keep a power up in reserve to switch back and forth as needed I typically opted for elephant Mario or good old fire Mario despite the joy radiating from most of the 2D Super Mario Brothers Wonder it's not quite up to par with the last Mainline 3D Mario Masterpiece Super Mario Odyssey the music while not at all bad is surprisingly forgettable this time [Music] around and while there are some five-star difficulty stages including an entire group of them I won't spoil here wonder is a bit light on the challenge side of things so there's not as much here for season series Veterans as its predecessor has though In fairness Mario is for everyone and my daughter appreciated the inclusion of nabit as a playable character when we played together enemies couldn't hurt her and we had more fun progressing through many of the stages why I nevertheless remain hungry for Mario's Next 3D Adventure especially as I watch the calendar surpass 6 years since Odyssey Super Mario Brothers Wonder establishes a new standard for what 2D Mario Platformers should look like it is colorful it is alive and it is joyful it also managed to surprise and Delight me in continually more creative ways thanks to its unpredictable Wonder effects which transform levels into something completely different for a brief while like dessert in the middle of the main course of each stage they were irresistible and always put a smile on my face as did the absolute Beast that is elephant Mario in every other way other than Advanced challenges Wonder feels like a 2st century successor to Super Mario World and I'm not sure I can give it a higher compliment than that for more Super Mario that's arriving this fall don't miss the latest Gameplay trailer for Super Mario RPG remake and for everything else in the world of video games take a warp pipe over to IGN bye-bye`,
          debug: [
            'Fetching metadata...',
            'Extracting game/channel info...',
            'Getting transcript (captions/audio)...',
            'Starting hybrid transcript for S8mbe6mF0js',
            'Attempting captions for S8mbe6mF0js',
            '✅ Captions successful: 8823 characters',
            'Normalizing review...',
            'Running bias/sentiment analysis...',
          ],
        },
      });
      setProcessing(false);
      setProgressLogs([
        'Fetching metadata...',
        'Extracting game/channel info...',
        'Getting transcript (captions/audio)...',
        'Starting hybrid transcript for S8mbe6mF0js',
        'Attempting captions for S8mbe6mF0js',
        '✅ Captions successful: 8823 characters',
        'Normalizing review...',
        'Running bias/sentiment analysis...',
      ]);
      setIsSuccess(true);
    }, 500);
  };

  // DEMO BUTTON HANDLER (Concord)
  const handleDemoLLMAnalysisConcord = () => {
    setProcessing(true);
    setError(null);
    setTimeout(() => {
      setResult({
        data: {
          metadata: {
            title: 'Concord Review - The Final Verdict',
            channelTitle: 'GamingBolt',
            channelId: 'UCXa_bzvv7Oo1glaW9FldDhQ',
            publishedAt: '2024-08-25T06:30:12Z',
            description:
              "If it had launched before Overwatch 2, Firewalk Studios' Concord may have served as a decent alternative in the hero shooter genre. Unfortunately, it's available in 2024 and demands $40, while other competitive multiplayer options are free-to-play.\n\nIt wouldn't be that big of a deal if Concord's gameplay offered something unique and compelling, be it in the Freegunners and their kits, the modes, or the progression. Instead, it opts to play things relatively safe, leaning into mostly generic hero abilities while introducing Crew Bonuses for character-switching (though you don't have to).\n\nThis is on top of lore revealed through the Galactic Guide and weekly vignettes meant to endear its characters to players, but it just doesn't resonate enough with what Concord is going for. Even if it eventually went free-to-play, Concord's gameplay systems, characters and content have a way to go from simply average to genuinely enticing.",
            thumbnails: {
              default: {
                url: 'https://i.ytimg.com/vi/Mp_AmK8FDu0/default.jpg',
                width: 120,
                height: 90,
              },
              medium: {
                url: 'https://i.ytimg.com/vi/Mp_AmK8FDu0/mqdefault.jpg',
                width: 320,
                height: 180,
              },
              high: {
                url: 'https://i.ytimg.com/vi/Mp_AmK8FDu0/hqdefault.jpg',
                width: 480,
                height: 360,
              },
              standard: {
                url: 'https://i.ytimg.com/vi/Mp_AmK8FDu0/sddefault.jpg',
                width: 640,
                height: 480,
              },
              maxres: {
                url: 'https://i.ytimg.com/vi/Mp_AmK8FDu0/maxresdefault.jpg',
                width: 1280,
                height: 720,
              },
            },
            tags: [
              'concord ps5 review',
              'concord pc review',
              'concord review score',
              'concord video review',
              'concord gamingbolt video review',
              'concord gameplay',
              'is concord a good game',
              'should i buy concord',
              'is concord a recommended game',
              'is concord a bad game',
              'concord',
              'gamingbolt',
            ],
          },
          sentiment: {
            score: 3,
            sentimentScore: 3,
            summary:
              'Concord is a 5v5 competitive shooter with unique heroes and a live service model, but it struggles with lackluster content, an identity crisis, and wasted narrative potential. Despite some intriguing lore and map design, the game fails to stand out in a crowded market of free-to-play shooters.',
            verdict: 'negative',
            sentimentSummary: 'Negative',
            biasIndicators: ['technical criticism'],
            alsoRecommends: ['Valorant', 'Overwatch 2', 'Overwatch', 'Destiny'],
            pros: [
              'Intriguing lore in the galactic guide',
              'Solid map designs and layouts',
              'Solid shooting abilities',
              'Unique weapons and abilities for each character',
              'Technically runs well',
            ],
            cons: [
              'Lackluster content and identity crisis',
              'Wasted narrative potential',
              'Limited voice lines and character development',
              'Sparse and unimaginative cosmetics',
              'Flawed gameplay modes',
              'Long matchmaking times',
              'Slower, floatier movement',
              'Gameplay lacks innovation',
              'World-building feels disconnected from multiplayer',
              'Crew bonuses feel unnecessary',
            ],
            reviewSummary:
              'Concord fails to leave a mark with its limited content and flawed mechanics, falling short of expectations in a competitive genre dominated by free-to-play giants.',
            biasDetection: {
              originalScore: 3,
              biasesDetected: [
                {
                  biasName: 'technical criticism',
                  severity: 'low',
                  impactOnExperience: 'Focus on technical flaws may overshadow other aspects.',
                  scoreInfluence: -0.2,
                  explanation: 'Technical criticism bias detected.',
                },
              ],
              reviewSummary:
                'Concord fails to leave a mark with its limited content and flawed mechanics, falling short of expectations in a competitive genre dominated by free-to-play giants.',
            },
            biasAdjustment: {
              biasAdjustedScore: 2.8,
              totalScoreAdjustment: -0.2,
              rationale: 'Score adjusted by -0.2 based on detected biases: technical criticism.',
            },
            sentimentSnapshot: {
              inferredScore: 3,
              verdict: 'negative',
              confidenceLevel: 'moderate',
              recommendationStrength: 'low',
            },
            culturalContext: {
              justification:
                'Based on the review transcript, certain ideological themes and narrative framings may influence audience perception.',
              ideologicalThemes: ['representation', 'studio reputation'],
              audienceReactions: {
                aligned:
                  'Likely to resonate strongly with fans of inclusive narratives and franchise loyalists.',
                neutral:
                  'May appreciate the technical and narrative strengths, but not be deeply moved.',
                opposed: 'Could be critical of perceived ideological or franchise-driven elements.',
              },
            },
          },
          transcript: `[Music] to say that firewalk Studios had an uphill battle to fight with Concord would be an understatement its characters already came across as trying too hard to emulate the mcu's Guardians of the Galaxy then it was revealed to be a 5v5 competitive shooter with unique Heroes and a live service model the $40 pricing was viewed as a big ask especially in this day and age when prominent competitive Shooters like valerant and over Watch 2 are free to play blinded as the months passed and the minuscule interest remains stagnant Concord finally released to a whopping 697 Peak concurrent players on Steam already touted as Dead on Arrival its flaws go beyond its lackluster content baffling crew bonuses identity crisis and wasted narrative potential for all the Pomp and Circumstances behind its weekly cinematic vignettes and popping pastel Hues Concord isn't all that interesting the story such as it is sees the crew of the Northstar urgently awaiting approval from The Guild to take on jobs spoiler they get it I pointed this out already in my Beta Impressions but revealing a game with a bombastic cinematic trailer and then kicking it off with a bunch of people sitting around a computer yeah that doesn't drum up interest yes I can see some of their quirks star child's fa Drax impression one-offs polite Android character heyar dreary it's not a phas mom Outlook but it doesn't build to anything if anything it's a lazy approach to justify why the Northstar crew is traveling across the Concord Galaxy taking on all these quests it's even more hilarious when you peek into the galactic guide one of the game's highlights this giant interactive map of the Galaxy provides lore for trade routes planets and other locations and there's some genuinely involving stuff the North Star was built by an unnamed Guild Corporation decades prior and now they want it back by any means necessary there's an unexplained Tempest wall destroying a once bustling trade Hub and consuming everything in its wake even light speed travel has an interesting backstory as you play more additional entries unlock letting you dive deeper into some points beyond their introductory text a shame then that they serve nothing more than lore having no impact on the actual gameplay imagine if this were a co-op PVE title with missions set in these locations alas unfortunately outside the weekly vignettes Concord does little to showcase the character's traits or interpersonal connections think of OverWatch and how it has conversations playing out in spawn or interesting quips when eliminating certain characters you may get a dialogue or two when a match starts like heyar saying you shouldn't make fun of a Mystic since they can light you on on fire she's the Mystic that's the joke however Beyond calling out enemy grenades or spouting some onliners the overall selection of voice lines feels limited making the free Gunners feel all the more soulless in terms of content Concord offers 16 playable characters each having variants 12 maps and Six modes divided into three playlists you also have a few time trials where you tackle specific challenges like running through trap wires and smashing enemies as star child in a race and they have leaderboard to compete in there's also a barebones training range and practice the six modes in question will look familiar to anyone who's played a competitive shooter in the last few years takeown is all about scoring kills while trophy Hunt is kill confirmed slay enemies gather their Bounty cards or deny them area control is domination with three zones to capture and hold while signal Chase is King of the Hill with the point moving after a brief period and perhaps the worst implementation of the mode I have ever seen the ladder spawns new control points too quickly and there are no lockout times so it's often better to cap the fresh Zone rather than contest the current one I'm unsure if this was an oversight or just a means to provide teams with a comeback mechanic either way it's annoying all these modes feature respawns the Rivalry playlist with cargo run AKA bomb diffusal and Clash point a more traditional King of the Hill doesn't once the objective is complete or opponents are defeated the round ends the first team to win four rounds wins the match each successive round win removes a character from your playable roster thus encouraging you to choose someone else both modes are decent enough though cargo run doesn't let you stop a rival team's extraction so much as convert their progress to yours another unique mechanic that I'm not a fan of but it's nowhere near as baffling as signal Chase overall it's not the most extensive amount of PVP content there's no free-for-all Deathmatch custom games or special modes to engage in the progression system is straightforward enough as you earn XP from completing dailies and weekly jobs to level your profile and characters to unlock new Cosmetics for a game that touts hundreds of customization items the variety and depth of Cosmetics feels sparse at best and unimaginative at worst it could be argued that OverWatch didn't offer much as a paid product at launch but that was 8 years ago by today's standards Concord isn't flourishing with things to do honestly I can't even say whether the lack of a proper ranked mode is all that bad given the long matchmaking times for rivalry or just how flawed the modes can be the maps look good even if they don't sport any Earth shatteringly new gimmicks for example the giant sea creatures corpse on water hazard is little more than a pathway and shock risk Sports a large Tower in the center with multiple windows and exits overlooking it free water gives pseudo Tatooine Vibes while glance and its extensive sight lines are more opulent the designs and layouts are solid overall right right down to the placements of Health packs flanking routes and choke points and thankfully they don't start to bleed together after extended periods the gun playing abilities feel solid enough though I'm not a fan of the slower floatier movement it encourages hanging back and team shooting yet it's not impossible to pull off flanks and maybe score a lucky kill or two on unaware opponents at times it feels like Concord wants to be a hero shooter like OverWatch and a faux Destiny clone each free Gunner has unique weapons and abilities while having unique roles though it's not mandatory to follow a one tank two damage to support composition to win some characters feel like must picks for their utilities like DAW and Lark though there's something to be said about their overall balance especially considering deployables which remain consistent between rounds having to deal with DA's Dome shield and healing pads with some decent damage to boot feels annoying especially in maps with zones meanwhile Lark Spore seeds are a must have for their damage resistance and movement speed while slowing enemies and making them vulnerable I need to reload caring enemy location between generic kits like Tio with his assault rifle smoke grenades and cluster grenades or Lennox with his explosive throwing knife revolvers and self-healing there are some distinct play Styles Kip's silenced burst pistol isn't ideal for full health targets but can catch weaker opponents off guard especially when using stealth disrupting their abilities and pinging them with surveillance traps is also ideal for the team then you have hear whose explosive shots which can be charged deal great damage while wall of fire and blinding flash provide area and crowd control there's nothing wrong with Concord playing things relatively safe with many of its character's abilities though they pale to what the competition offers one distinct difference from other hero Shooters is the lack of ultimates instead there are crew bonuses where switching to another role allows for inheriting bonuses from the previous one you could choose Roa a haunt for increased mobility and then on respawn opt for hear receiving more agility while hovering the bonuses aren't massive nor mandatory to pursue there to encourage switching to other characters between rounds I would prefer if the character's kits provided enough impetus for switching offering significant counterplay in some situations either way if you want to main a specific character throughout a match then not switching is still plenty comfortable there are also variants alternate character versions with different passives since you can only have one of each character in a match this is a way to circumvent that and have two lennox's or toos I shudder to think of two Daws with a NeverEnding assortment of shield and health pads technically Concord runs well enough with only the occasional latency issues and significant frame drops in a single match the problem is its overall makeup as intriguing as the World building can be it feels divorced from the competitive multiplayer aspect and plenty of other live service titles know how to leverage the former to bolster the ladder the gameplay and maps are decent enough but failed to deliver significantly fresh experiences meanwhile crew bonuses while neat in concept feel unnecessary and bog down the experience especially with the constant return to the character select screen how Concord evolves and whether firewalk Studios can inject some compelling ideas into the mix remains to be seen as of now there's very little reason to delve into it when so many other titles offer much more engaging gameplay free of charge hey did you know that we at gaming bolt upload new videos every day stick around drop a like subscribe and hit that Bell and let us know what kind of content you'd like to see in the future with a comment below [Music]`,
          debug: [
            'Fetching metadata...',
            'Extracting game/channel info...',
            'Getting transcript (captions/audio)...',
            'Starting hybrid transcript for Mp_AmK8FDu0',
            'Attempting captions for Mp_AmK8FDu0',
            '✅ Captions successful: 9763 characters',
            'Normalizing review...',
            'Running bias/sentiment analysis...',
          ],
        },
      });
      setProcessing(false);
      setProgressLogs([
        'Fetching metadata...',
        'Extracting game/channel info...',
        'Getting transcript (captions/audio)...',
        'Starting hybrid transcript for Mp_AmK8FDu0',
        'Attempting captions for Mp_AmK8FDu0',
        '✅ Captions successful: 9763 characters',
        'Normalizing review...',
        'Running bias/sentiment analysis...',
      ]);
      setIsSuccess(true);
    }, 500);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-gray-200 relative">
      <div className="absolute top-4 right-4">
        <span className="bg-yellow-200 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full border border-yellow-400 shadow-sm uppercase tracking-wide">
          Local Only
        </span>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-4">YouTube Video Processor</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            YouTube Video ID or URL
          </label>
          <input
            type="text"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            placeholder="dQw4w9WgXcQ or https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-600"
            disabled={processing}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-700">Stream progress</label>
          <input
            type="checkbox"
            checked={useStreaming}
            onChange={(e) => setUseStreaming(e.target.checked)}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={generalAnalysis}
            onChange={(e) => setGeneralAnalysis(e.target.checked)}
            id="general-analysis-checkbox"
            disabled={processing}
          />
          <label htmlFor="general-analysis-checkbox" className="text-sm text-gray-700 select-none">
            General analysis (&quot;What is this video about?&quot;)
          </label>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleGetMetadata}
            disabled={processing || !videoId.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Loading...' : 'Get Metadata'}
          </button>

          <button
            onClick={handleProcess}
            disabled={processing || !videoId.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Full Process'}
          </button>
        </div>

        <div className="mb-4">
          <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-900 p-4 rounded-lg">
            <span className="font-bold">Demo LLM Analysis Buttons:</span>
            <span className="block mt-1 text-sm">
              Instantly preview the full LLM bias analysis pipeline{' '}
              <b>without hitting YouTube or OpenAI</b>.<br />
              These buttons load a real review, transcript, and metadata as if it was processed
              live, so you can see the exact output and UI for a positive (Mario Wonder) and
              negative (Concord) review.
              <br />
              <b>No API calls, no rate limits, no YouTube required.</b>
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <button
            type="button"
            className="px-4 py-2 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition w-full sm:w-auto"
            onClick={handleDemoLLMAnalysisMario}
            disabled={processing}
          >
            Demo LLM Analysis (Mario Wonder)
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-blue-700 text-white rounded font-bold hover:bg-blue-800 transition w-full sm:w-auto"
            onClick={handleDemoLLMAnalysisConcord}
            disabled={processing}
          >
            Demo LLM Analysis (Concord)
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">Result:</h4>
            <pre className="text-xs text-gray-700 overflow-auto max-h-96">
              {JSON.stringify(fullResult, null, 2)}
            </pre>
          </div>
        )}

        {progressLogs.length > 0 && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
              <div
                className={
                  !isSuccess
                    ? `h-3 rounded-full ${styles.shimmer}`
                    : 'bg-blue-600 h-3 rounded-full transition-all duration-300'
                }
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <ul className="text-xs mb-2">
              {steps.map((step, i) => (
                <li
                  key={step}
                  className={
                    isSuccess
                      ? 'text-gray-500 line-through'
                      : i === currentStep
                        ? 'text-blue-800 font-semibold'
                        : i < currentStep
                          ? 'text-gray-500 line-through'
                          : 'text-gray-400'
                  }
                >
                  {step}
                </li>
              ))}
            </ul>
            {isTrulySuccess && !error && (
              <div className="flex items-center text-green-600 mt-2" ref={resultRef}>
                <CheckCircleIcon className="w-5 h-5 mr-2" />
                <span className="font-semibold">Success!</span>
              </div>
            )}
            {(error || hasTranscriptError) && (
              <div className="flex items-center text-red-600 mt-2">
                <XCircleIcon className="w-5 h-5 mr-2" />
                <span className="font-semibold">Failed!</span>
              </div>
            )}
          </div>
        )}

        {(() => {
          const meta = fullResult.metadata || fullResult.data?.metadata;
          const isGeneralAnalysis = !!fullResult.summary && Array.isArray(fullResult.keyNotes);
          const sentiment = fullResult.sentiment;
          const biasAdjustment = fullResult.biasAdjustment || fullResult.sentiment?.biasAdjustment;
          const biasDetection = fullResult.biasDetection || fullResult.sentiment?.biasDetection;
          const context = fullResult.culturalContext || fullResult.sentiment?.culturalContext;
          const alsoRecommends = sentiment?.alsoRecommends || [];
          const biasIndicators = sentiment?.biasIndicators || [];
          const detectedBiases = biasDetection?.biasesDetected || [];
          const rationale = biasAdjustment?.rationale || biasAdjustment?.adjustmentRationale;
          const biasAdjustedScore = biasAdjustment?.biasAdjustedScore;
          const originalScore = biasDetection?.originalScore ?? sentiment?.score;
          // If general analysis is checked and data is present, show ONLY the general analysis block
          if (generalAnalysis && isGeneralAnalysis) {
            return (
              <div className="mt-8">
                {/* Metadata card (always show) */}
                <YouTubeMetaCard
                  meta={meta}
                  videoId={videoId}
                  showVideo={showVideo}
                  setShowVideo={setShowVideo}
                />
                {/* General analysis summary card */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
                  <div className="text-xl font-bold text-gray-900 mb-2">Video Summary</div>
                  <div className="text-base text-gray-800 mb-4">{fullResult.summary}</div>
                  <div className="text-lg font-semibold text-blue-700 mb-2">Key Notes</div>
                  <ul className="list-disc list-inside text-sm text-gray-800 mb-4">
                    {fullResult.keyNotes.map((note: string, i: number) => (
                      <li key={i}>{note}</li>
                    ))}
                  </ul>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-gray-500 hover:underline">
                      Show full transcript
                    </summary>
                    <pre className="text-xs text-gray-700 bg-gray-50 rounded p-2 mt-2 max-h-96 overflow-auto whitespace-pre-wrap">
                      {fullResult.transcript}
                    </pre>
                  </details>
                </div>
              </div>
            );
          }
          // Otherwise, show the original review/bias block (full process details)
          if (meta && sentiment) {
            return (
              <div
                ref={resultRef}
                className="mt-8 bg-white rounded-lg shadow border border-gray-200"
              >
                {/* Metadata card (same as general analysis) */}
                <YouTubeMetaCard
                  meta={meta}
                  videoId={videoId}
                  showVideo={showVideo}
                  setShowVideo={setShowVideo}
                />
                {/* Review summary, verdict, score, pros, cons */}
                <div className="px-6 pb-6 mt-2">
                  <div className="text-lg font-semibold text-green-700 mb-2">Review Summary</div>
                  <div className="text-base text-gray-900 mb-2">
                    {sentiment.reviewSummary || sentiment.summary}
                  </div>
                  <div className="flex flex-wrap gap-4 mb-2">
                    <div>
                      <div className="text-xs text-gray-500">Verdict</div>
                      <div className="text-sm font-bold text-gray-800">{sentiment.verdict}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Score</div>
                      <div className="text-sm font-bold text-gray-800">
                        {sentiment.sentimentScore ?? sentiment.score}
                      </div>
                    </div>
                  </div>
                  {sentiment.pros && sentiment.pros.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-green-700 font-semibold mb-1">Pros</div>
                      <ul className="list-disc list-inside text-sm text-gray-800">
                        {sentiment.pros.map((pro: string) => (
                          <li key={pro}>{pro}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {sentiment.cons && sentiment.cons.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs text-red-700 font-semibold mb-1">Cons</div>
                      <ul className="list-disc list-inside text-sm text-gray-800">
                        {sentiment.cons.map((con: string) => (
                          <li key={con}>{con}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                {/* --- Bias-Adjusted Score Card --- */}
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 px-6 pt-4 pb-2 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Original Score</span>
                    <span className="text-lg font-bold text-gray-800">{originalScore ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Bias-Adjusted</span>
                    <span
                      className={`text-lg font-bold ${biasAdjustedScore !== originalScore ? 'text-blue-700' : 'text-gray-800'}`}
                    >
                      {biasAdjustedScore ?? '—'}
                    </span>
                    {biasAdjustedScore !== originalScore && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                        Adjusted
                      </span>
                    )}
                  </div>
                </div>
                {rationale && (
                  <div className="px-6 pb-2 pt-2 text-sm text-gray-700 italic border-b">
                    {rationale}
                  </div>
                )}
                {/* --- Expandable Advanced Details --- */}
                <div className="px-6 py-4">
                  <button
                    className="text-xs text-blue-700 font-semibold underline mb-2 focus:outline-none"
                    onClick={() => setShowDetails((v) => !v)}
                  >
                    {showDetails ? 'Hide advanced details' : 'Show advanced details'}
                  </button>
                  {showDetails && (
                    <div className="space-y-4 mt-2">
                      {alsoRecommends.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-semibold mb-1">
                            Also Recommends
                          </div>
                          <ul className="flex flex-wrap gap-2">
                            {alsoRecommends.map((rec: string) => (
                              <li
                                key={rec}
                                className="bg-gray-100 px-2 py-0.5 rounded text-xs text-gray-800"
                              >
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {biasIndicators.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-semibold mb-1">
                            Bias Indicators
                          </div>
                          <ul className="flex flex-wrap gap-2">
                            {biasIndicators.map((b: string) => (
                              <li
                                key={b}
                                className="bg-yellow-100 px-2 py-0.5 rounded text-xs text-yellow-800"
                              >
                                {b}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {detectedBiases.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-500 font-semibold mb-1">
                            Detected Biases
                          </div>
                          <ul className="space-y-1">
                            {detectedBiases.map((b: any, i: number) => (
                              <li key={b.biasName + i} className="border rounded p-2 bg-yellow-50">
                                <div className="font-semibold text-yellow-900 text-sm">
                                  {b.biasName}
                                </div>
                                <div className="text-xs text-gray-700">
                                  Severity: <span className="font-semibold">{b.severity}</span>
                                </div>
                                <div className="text-xs text-gray-700">
                                  Impact: {b.impactOnExperience}
                                </div>
                                <div className="text-xs text-gray-700">
                                  Score Influence:{' '}
                                  <span className="font-semibold">{b.scoreInfluence}</span>
                                </div>
                                <div className="text-xs text-gray-700">{b.explanation}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {context && (
                        <div>
                          <div className="text-xs text-gray-500 font-semibold mb-1">
                            Cultural Context
                          </div>
                          <div className="text-xs text-gray-700 mb-1">{context.justification}</div>
                          <div className="flex flex-wrap gap-2 mb-1">
                            {context.ideologicalThemes?.map((theme: string) => (
                              <span
                                key={theme}
                                className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs"
                              >
                                {theme}
                              </span>
                            ))}
                          </div>
                          <div className="text-xs text-gray-700">Audience Reactions:</div>
                          <ul className="ml-4 text-xs text-gray-700">
                            <li>
                              <span className="font-semibold">Aligned:</span>{' '}
                              {context.audienceReactions?.aligned}
                            </li>
                            <li>
                              <span className="font-semibold">Neutral:</span>{' '}
                              {context.audienceReactions?.neutral}
                            </li>
                            <li>
                              <span className="font-semibold">Opposed:</span>{' '}
                              {context.audienceReactions?.opposed}
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}
