import React, { useCallback, useRef, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import homeStore from '@/features/stores/home'
import menuStore from '@/features/stores/menu'
import settingsStore, {
  multiModalAIServiceKey,
} from '@/features/stores/settings'
import slideStore from '@/features/stores/slide'
import { AssistantText } from './assistantText'
import { ChatLog } from './chatLog'
import { IconButton } from './iconButton'
import Settings from './settings'
import { Webcam } from './webcam'
import Slides from './slides'
import Capture from './capture'

export const Menu = () => {
  const selectAIService = settingsStore((s) => s.selectAIService)
  const youtubeMode = settingsStore((s) => s.youtubeMode)
  const youtubePlaying = settingsStore((s) => s.youtubePlaying)
  const slideMode = settingsStore((s) => s.slideMode)
  const slideVisible = menuStore((s) => s.slideVisible)
  const assistantMessage = homeStore((s) => s.assistantMessage)
  const showWebcam = menuStore((s) => s.showWebcam)
  const showControlPanel = settingsStore((s) => s.showControlPanel)
  const showCapture = menuStore((s) => s.showCapture)
  const slidePlaying = slideStore((s) => s.isPlaying)
  const showAssistantText = settingsStore((s) => s.showAssistantText)

  const [showSettings, setShowSettings] = useState(false)
  const [showChatLog, setShowChatLog] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const imageFileInputRef = useRef<HTMLInputElement>(null)

  const selectedSlideDocs = slideStore((state) => state.selectedSlideDocs)
  const { t } = useTranslation()

  const [markdownContent, setMarkdownContent] = useState('')

  useEffect(() => {
    if (!selectedSlideDocs) return

    fetch(`/slides/${selectedSlideDocs}/slides.md`)
      .then((response) => response.text())
      .then((text) => setMarkdownContent(text))
      .catch((error) =>
        console.error('Failed to fetch markdown content:', error)
      )
  }, [selectedSlideDocs])

  const handleChangeVrmFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files) return

      const file = files[0]
      if (!file) return

      const file_type = file.name.split('.').pop()

      if (file_type === 'vrm') {
        const blob = new Blob([file], { type: 'application/octet-stream' })
        const url = window.URL.createObjectURL(blob)

        const hs = homeStore.getState()
        hs.viewer.loadVrm(url)
      }

      event.target.value = ''
    },
    []
  )

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === '.') {
        setShowSettings((prevState) => !prevState)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    console.log('onChangeWebcamStatus')
    homeStore.setState({ webcamStatus: showWebcam })

    if (showWebcam) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(() => {
          setShowPermissionModal(false)
        })
        .catch(() => {
          setShowPermissionModal(true)
        })
    }
  }, [showWebcam])

  useEffect(() => {
    console.log('onChangeCaptureStatus')
    homeStore.setState({ captureStatus: showCapture })
  }, [showCapture])

  useEffect(() => {
    if (!youtubePlaying) {
      settingsStore.setState({
        youtubeContinuationCount: 0,
        youtubeNoCommentCount: 0,
        youtubeSleepMode: false,
      })
    }
  }, [youtubePlaying])

  const toggleCapture = useCallback(() => {
    menuStore.setState(({ showCapture }) => ({ showCapture: !showCapture }))
    menuStore.setState({ showWebcam: false }) // Captureを表示するときWebcamを非表示にする
  }, [])

  const toggleWebcam = useCallback(() => {
    menuStore.setState(({ showWebcam }) => ({ showWebcam: !showWebcam }))
    menuStore.setState({ showCapture: false }) // Webcamを表示するときCaptureを非表示にする
  }, [])

  return (
    <>
      <div className="absolute z-15 m-24">
        <div
          className="grid md:grid-flow-col gap-[8px] mb-40"
          style={{ width: 'max-content' }}
        >
          {showControlPanel && (
            <>
              <div className="md:order-1 order-2">
                <IconButton
                  iconName="24/Settings"
                  isProcessing={false}
                  onClick={() => setShowSettings(true)}
                ></IconButton>
              </div>
              <div className="md:order-2 order-1">
                {showChatLog ? (
                  <IconButton
                    iconName="24/CommentOutline"
                    label={t('ChatLog')}
                    isProcessing={false}
                    onClick={() => setShowChatLog(false)}
                  />
                ) : (
                  <IconButton
                    iconName="24/CommentFill"
                    label={t('ChatLog')}
                    isProcessing={false}
                    disabled={false}
                    onClick={() => setShowChatLog(true)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="relative">
        {slideMode && slideVisible && <Slides markdown={markdownContent} />}
      </div>
      {showChatLog && <ChatLog />}
      {showSettings && <Settings onClickClose={() => setShowSettings(false)} />}
      {!showChatLog &&
        assistantMessage &&
        (!slideMode || !slideVisible) &&
        showAssistantText && <AssistantText message={assistantMessage} />}
      {showWebcam && navigator.mediaDevices && <Webcam />}
      {showCapture && <Capture />}
      {showPermissionModal && (
        <div className="modal">
          <div className="modal-content">
            <p>カメラの使用を許可してください。</p>
            <button onClick={() => setShowPermissionModal(false)}>
              閉じる
            </button>
          </div>
        </div>
      )}
      <input
        type="file"
        className="hidden"
        accept=".vrm"
        ref={(fileInput) => {
          if (!fileInput) {
            menuStore.setState({ fileInput: null })
            return
          }

          menuStore.setState({ fileInput })
        }}
        onChange={handleChangeVrmFile}
      />
      <input
        type="file"
        className="hidden"
        accept="image/*"
        ref={(bgFileInput) => {
          if (!bgFileInput) {
            menuStore.setState({ bgFileInput: null })
            return
          }

          menuStore.setState({ bgFileInput })
        }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            const imageUrl = URL.createObjectURL(file)
            homeStore.setState({ backgroundImageUrl: imageUrl })
          }
        }}
      />
    </>
  )
}
