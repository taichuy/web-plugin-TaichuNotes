import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react"
import Vditor from "vditor"
import "vditor/dist/index.css"
import { useStorage } from "@plasmohq/storage/hook"
import { localStorage, syncStorage } from "~lib/storage"
import { executeWorkflow } from "~lib/workflow"
import type { ExtractedData, ExtractMode, WorkflowRequest } from "~lib/types"
import { 
  ConfigProvider, 
  Layout, 
  Button, 
  Input, 
  Tooltip, 
  message, 
  Spin, 
  theme, 
  Typography,
  Space,
  Alert,
  Menu,
  Select
} from "antd"
import { 
  SettingOutlined, 
  RocketOutlined, 
  FileTextOutlined, 
  ScissorOutlined, 
  SelectOutlined, 
  SendOutlined,
  ArrowLeftOutlined,
  WarningOutlined,
  DeleteOutlined,
  CopyOutlined,
  DownloadOutlined,
  GlobalOutlined,
  InfoCircleOutlined
} from "@ant-design/icons"

import "~style.css"

const { Header, Content, Footer, Sider } = Layout
const { TextArea } = Input
const { Title, Text } = Typography

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Sidepanel Error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red' }}>
          <h3>Something went wrong.</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{this.state.error?.message}</pre>
          <Button onClick={() => window.location.reload()}>Reload Sidepanel</Button>
        </div>
      )
    }

    return this.props.children
  }
}

const DEFAULT_WORKFLOW: WorkflowRequest[] = [
  {
    url: "https://httpbin.org/post",
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: {
      title: "$web_title",
      content: "$main_text",
      url: "$source_url"
    }
  }
]

const SidePanelContent = () => {
  const [currentClip, setCurrentClip] = useStorage<ExtractedData>({
    key: "current_clip",
    instance: localStorage
  })
  const [workflowConfig, setWorkflowConfig] = useStorage<WorkflowRequest[]>({
    key: "workflow_config",
    instance: syncStorage
  }, DEFAULT_WORKFLOW)
  
  const [userLanguage, setUserLanguage] = useStorage<string>({
    key: "user_language",
    instance: syncStorage
  }, "zh")
  
  const [view, setView] = useState<"editor" | "settings">("editor")
  const [activeSetting, setActiveSetting] = useState("workflow")
  const [loading, setLoading] = useState(false)
  const [loadingTip, setLoadingTip] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isVditorReady, setIsVditorReady] = useState(false)
  
  const vditorRef = useRef<Vditor | null>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  
  const [messageApi, contextHolder] = message.useMessage()

  // Detect system theme for Ant Design - MOVED UP
  const [isDarkMode, setIsDarkMode] = useState(false)
  useEffect(() => {
    // Safety check for window object
    if (typeof window === 'undefined') return

    try {
      const matchMedia = window.matchMedia('(prefers-color-scheme: dark)')
      setIsDarkMode(matchMedia.matches)
      const handler = (e: MediaQueryListEvent) => setIsDarkMode(e.matches)
      matchMedia.addEventListener('change', handler)
      return () => matchMedia.removeEventListener('change', handler)
    } catch (e) {
      console.warn("Theme detection failed:", e)
    }
  }, [])

  const lastProcessedContent = useRef<string | null>(null)

  // Manually inject Vditor icons to ensure they load in extension environment
  useEffect(() => {
    try {
      const scriptId = 'vditor-icon-script'
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script')
        script.id = scriptId
        script.src = chrome.runtime.getURL("assets/vditor/dist/js/icons/ant.js")
        script.async = true
        document.body.appendChild(script)
      }
    } catch (e) {
      console.warn("Failed to inject icon script:", e)
    }
  }, [])

  // Initialize Vditor
  useEffect(() => {
    if (view === "editor" && editorContainerRef.current && !vditorRef.current) {
      const initVditor = async () => {
        try {
          // Small delay to ensure DOM is ready
          await new Promise(resolve => setTimeout(resolve, 100))
          
          if (!editorContainerRef.current) return

          console.log("Initializing Vditor...")
          vditorRef.current = new Vditor(editorContainerRef.current, {
            height: "100%",
            cdn: chrome.runtime.getURL("assets/vditor"),
            lang: userLanguage === 'en' ? 'en_US' : 'zh_CN',
            theme: isDarkMode ? "dark" : "classic",
            icon: "ant", // Use Ant Design style icons if available, or stick to default "ant" which is clean
            mode: "ir", //  ir mode
            toolbar: [
              "headings",
              "bold",
              "italic",
              "strike",
              "link",
              "|",
              "list",
              "ordered-list",
              "check",
              "|",
              "quote",
              "line",
              "code",
              "|",
              "edit-mode",
              "both",
              "preview",
            ],
            cache: { enable: false },
            value: "", // Let useEffect handle initial content
            input: (_val) => {
              // Handle input if needed
            },
            after: () => {
              console.log("Vditor initialized successfully")
              setIsVditorReady(true)
            }
          })
        } catch (err) {
          console.error("Vditor Init Error:", err)
          setErrorMsg("Failed to initialize editor: " + err.message)
        }
      }
      
      initVditor()
    }
    
    return () => {
      // Cleanup Vditor instance when unmounting or switching views
      if (vditorRef.current) {
        vditorRef.current.destroy()
        vditorRef.current = null
        setIsVditorReady(false)
      }
    }
  }, [view, isDarkMode, userLanguage]) // Removed currentClip?.content to prevent re-init on content change

  // Update Vditor theme when isDarkMode changes
  useEffect(() => {
    if (isVditorReady && vditorRef.current) {
      const theme = isDarkMode ? "dark" : "classic"
      vditorRef.current.setTheme(theme, theme, theme)
    }
  }, [isDarkMode, isVditorReady])

  // Update content when clip changes
  useEffect(() => {
    if (isVditorReady && vditorRef.current && currentClip?.content) {
      // Check if this content has already been processed to avoid duplicates/loops
      if (currentClip.content !== lastProcessedContent.current) {
        const currentVal = vditorRef.current.getValue()
        
        if (!currentVal || currentVal.trim() === "") {
           vditorRef.current.setValue(currentClip.content)
        } else {
           // Append new content
           vditorRef.current.setValue(currentVal + "\n\n---\n\n" + currentClip.content)
        }
        
        lastProcessedContent.current = currentClip.content
      }
      // Always stop loading when content updates
      setLoading(false)
    }
  }, [currentClip, isVditorReady])

  const handleClear = () => {
    if (!isVditorReady) return
    vditorRef.current?.setValue("")
    setCurrentClip(null)
    lastProcessedContent.current = null
    messageApi.success("Editor cleared")
  }

  const handleCopy = async () => {
    if (!isVditorReady) return
    const content = vditorRef.current?.getValue() || ""
    if (!content) {
      messageApi.warning("No content to copy")
      return
    }
    try {
      await navigator.clipboard.writeText(content)
      messageApi.success("Copied to clipboard")
    } catch (err) {
      console.error(err)
      messageApi.error("Failed to copy")
    }
  }

  const handleDownload = () => {
    if (!isVditorReady) return
    const content = vditorRef.current?.getValue() || ""
    if (!content) {
      messageApi.warning("No content to download")
      return
    }
    try {
      const blob = new Blob([content], { type: "text/markdown" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `clipping-${new Date().toISOString().slice(0, 10)}.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      messageApi.success("Download started")
    } catch (err) {
      console.error(err)
      messageApi.error("Failed to download")
    }
  }

  const handleExtract = async (mode: ExtractMode) => {
    // setLoading(true)
    // setLoadingTip("Extracting content...")
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
         throw new Error("No active tab found.")
      }
      
      // Check if we can inject script/send message (avoid chrome:// urls)
      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
         throw new Error("Cannot clip content from browser system pages.")
      }

      if (mode === "selection") {
        setLoadingTip("Please select an element on the page...")
        try {
          await chrome.tabs.sendMessage(tab.id, { action: "extract", mode: "selection" })
        } catch (err) {
           if (err.message.includes("Could not establish connection")) {
              throw new Error("Please refresh the page to enable the clipper.")
           }
           throw err
        }
        // window.close() // Don't close side panel for selection
        return
      }

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: "extract", mode })
        if (response.status === "success") {
          setCurrentClip(response.data)
          messageApi.success("Extracted successfully")
        } else {
          throw new Error(response.message || "Extraction failed")
        }
      } catch (err) {
         if (err.message.includes("Could not establish connection")) {
            throw new Error("Please refresh the page to enable the clipper.")
         }
         throw err
      }
    } catch (e) {
      console.error(e)
      messageApi.error("Failed: " + e.message)
    } finally {
      if (mode !== "selection") {
        setLoading(false)
      }
    }
  }

  const handleSend = async () => {
    if (!currentClip) return
    
    const content = (isVditorReady && vditorRef.current?.getValue()) || currentClip.content
    const dataToSend = { ...currentClip, content }
    
    setLoading(true)
    setLoadingTip("Executing workflow...")
    
    try {
      const results = await executeWorkflow(workflowConfig, dataToSend)
      const failed = results.filter(r => !r.success)
      
      if (failed.length > 0) {
        throw new Error(`Failed requests: ${failed.length}`)
      }
      
      messageApi.success("Workflow executed successfully!")
    } catch (e) {
      messageApi.error("Error: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Detect system theme for Ant Design - Already moved up
  // const [isDarkMode, setIsDarkMode] = useState(false)
  // ... (Removed duplicate declaration)

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      {contextHolder}
      <Layout style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
        <Header style={{ 
          padding: '0 16px', 
          background: isDarkMode ? '#141414' : '#fff', 
          borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 48,
          lineHeight: '48px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Title level={5} style={{ margin: 0, color: '#1677ff' }}>Taichuy Clipper</Title>
          </div>
          <div>
            <Tooltip title={view === "editor" ? "Settings" : "Back to Editor"}>
              <Button 
                type="text" 
                icon={view === "editor" ? <SettingOutlined /> : <ArrowLeftOutlined />} 
                onClick={() => setView(view === "editor" ? "settings" : "editor")}
              />
            </Tooltip>
          </div>
        </Header>

        <Content style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          background: isDarkMode ? '#000' : '#fff'
        }}>
          {errorMsg && (
            <Alert 
              message="Error" 
              description={errorMsg} 
              type="error" 
              showIcon 
              closable 
              onClose={() => setErrorMsg(null)}
              style={{ margin: 16 }}
            />
          )}
          
          {view === "editor" ? (
            <>
            {/* Toolbar */}
            <div style={{ 
              padding: '8px 16px', 
              borderBottom: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
              background: isDarkMode ? '#141414' : '#fafafa',
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}>
              <Space>
                <Tooltip title="Auto-detect content">
                  <Button icon={<RocketOutlined />} size="small" onClick={() => handleExtract("smart")}>Smart</Button>
                </Tooltip>
                <Tooltip title="Full page HTML">
                  <Button icon={<FileTextOutlined />} size="small" onClick={() => handleExtract("full")}>Full</Button>
                </Tooltip>
                <Tooltip title="Selected text">
                  <Button icon={<ScissorOutlined />} size="small" onClick={() => handleExtract("selected")}>Selected</Button>
                </Tooltip>
                <Tooltip title="Select element on page">
                  <Button icon={<SelectOutlined />} size="small" onClick={() => handleExtract("selection")}>Pick Element</Button>
                </Tooltip>
              </Space>
            </div>

            {/* Editor */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {loading && (
                <div style={{ 
                  position: 'absolute', 
                  inset: 0, 
                  zIndex: 10, 
                  background: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Spin tip={loadingTip} />
                </div>
              )}
              <div ref={editorContainerRef} style={{ height: '100%', width: '100%' }} />
            </div>
          </>
        ) : (
          <Layout style={{ height: '100%', background: 'transparent' }}>
            <Sider 
              width={120} 
              theme={isDarkMode ? 'dark' : 'light'} 
              style={{ 
                borderRight: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                background: isDarkMode ? '#141414' : '#fff'
              }}
            >
              <Menu
                mode="inline"
                className="side-menu"
                selectedKeys={[activeSetting]}
                onClick={({ key }) => setActiveSetting(key)}
                style={{ height: '100%', borderRight: 0, background: 'transparent' }}
                items={[
                  { key: 'workflow', label: '工作流配置' },
                  { key: 'language', label: '语言'},
                  { key: 'about', label: '关于我们' },
                ]}
              />
            </Sider>
            <Content style={{ padding: 16, overflowY: 'auto', background: isDarkMode ? '#000' : '#fff' }}>
              {activeSetting === 'workflow' && (
                <>
                  <Title level={5}>工作流配置</Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    Available variables: <Text code>$main_text</Text>, <Text code>$source_url</Text>, <Text code>$web_title</Text>, <Text code>$author</Text>
                  </Text>
                  <TextArea 
                    rows={15}
                    value={JSON.stringify(workflowConfig, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value)
                        setWorkflowConfig(parsed)
                      } catch (_err) {
                        // ignore invalid json while typing
                      }
                    }}
                    style={{ fontFamily: 'monospace' }}
                  />
                </>
              )}
              {activeSetting === 'language' && (
                <div>
                  <Title level={5}>语言设置</Title>
                  <Select 
                    value={userLanguage}
                    onChange={(val) => setUserLanguage(val)}
                    style={{ width: 120 }} 
                    options={[
                      { value: 'en', label: 'English' }, 
                      { value: 'zh', label: '中文' }
                    ]} 
                  />
                </div>
              )}
              {activeSetting === 'about' && (
                <div>
                  <Title level={5}>关于我们</Title>
                  <Text strong>Taichuy Web Clipper</Text>
                  <br/>
                  <Text type="secondary">版本: 0.0.1</Text>
                  <br/><br/>
                  <Text>一个强大的网页剪藏工具，支持自定义工作流，助您高效管理知识。</Text>
                </div>
              )}
            </Content>
          </Layout>
        )}
      </Content>

      <Footer style={{ 
        padding: '8px 16px', 
        background: isDarkMode ? '#141414' : '#fff',
        borderTop: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
        height: 49,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {view === "editor" && (
          <>
            <Space size="small">
               <Tooltip title="Clear Content">
                  <Button danger icon={<DeleteOutlined />} onClick={handleClear} />
               </Tooltip>
               <Tooltip title="Copy Markdown">
                  <Button icon={<CopyOutlined />} onClick={handleCopy} />
               </Tooltip>
               <Tooltip title="Download Markdown">
                  <Button icon={<DownloadOutlined />} onClick={handleDownload} />
               </Tooltip>
            </Space>
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={handleSend}
              loading={loading}
              disabled={!currentClip}
            >
              Execute Workflow
            </Button>
          </>
        )}
      </Footer>
    </Layout>
    </ConfigProvider>
  )
}

const SidePanel = () => (
  <ErrorBoundary>
    <SidePanelContent />
  </ErrorBoundary>
)

export default SidePanel
