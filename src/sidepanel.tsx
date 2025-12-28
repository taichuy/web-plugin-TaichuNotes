import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react"
import Vditor from "vditor"
import "vditor/dist/index.css"
import { useStorage } from "@plasmohq/storage/hook"
import { localStorage, syncStorage } from "~lib/storage"
import { executeWorkflow } from "~lib/workflow"
import type { ExtractedData, ExtractMode, PushService } from "~lib/types"
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
  Select,
  List,
  Switch,
  Modal,
  Form,
  Card,
  Popconfirm,
  Tag,
  Row,
  Col
} from "antd"
import { 
  SettingOutlined, 
  RocketOutlined, 
  FileTextOutlined, 
  ScissorOutlined, 
  SelectOutlined, 
  SendOutlined,
  ArrowLeftOutlined,
  DeleteOutlined,
  CopyOutlined,
  DownloadOutlined,
  PlusOutlined,
  EditOutlined
} from "@ant-design/icons"

import "~style.css"

const { Header, Content, Footer, Sider } = Layout
const { TextArea } = Input
const { Title, Text } = Typography

// Error Boundary Component
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
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

const DEFAULT_SERVICES: PushService[] = [
  {
    name: "HTTP Bin Test",
    description: "Post to httpbin for testing",
    is_open: true,
    server_type: "http",
    config: {
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
  }
]

const SidePanelContent = () => {
  const [currentClip, setCurrentClip] = useStorage<ExtractedData | null>({
    key: "current_clip",
    instance: localStorage
  })
  const [servicesConfig, setServicesConfig] = useStorage<PushService[]>({
    key: "services_config",
    instance: syncStorage
  }, DEFAULT_SERVICES)
  
  const [userLanguage, setUserLanguage] = useStorage<string>({
    key: "user_language",
    instance: syncStorage
  }, "zh")
  
  const [view, setView] = useState<"editor" | "settings">("editor")
  const [activeSetting, setActiveSetting] = useState("services")
  const [loading, setLoading] = useState(false)
  const [loadingTip, setLoadingTip] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isVditorReady, setIsVditorReady] = useState(false)
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form] = Form.useForm()

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
              "export",
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
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error("Vditor Init Error:", error)
        setErrorMsg("Failed to initialize editor: " + error.message)
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
    setLoading(true)
    setLoadingTip("Extracting content...")
    
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
           const errorMessage = err instanceof Error ? err.message : String(err)
           if (errorMessage.includes("Could not establish connection")) {
              throw new Error("Please refresh the page to enable the clipper.")
           }
           throw err
        }
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
      } catch (err: unknown) {
         const errorMessage = err instanceof Error ? err.message : String(err)
         if (errorMessage.includes("Could not establish connection")) {
            throw new Error("Please refresh the page to enable the clipper.")
         }
         throw err
      }
    } catch (e: unknown) {
      console.error(e)
      const errorMessage = e instanceof Error ? e.message : String(e)
      messageApi.error("Failed: " + errorMessage)
    } finally {
      if (mode !== "selection") {
        setLoading(false)
      }
    }
  }

  const handleSend = async () => {
    if (!currentClip) return
    
    const content = (isVditorReady && vditorRef.current) ? vditorRef.current.getValue() : currentClip.content
    const dataToSend = { ...currentClip, content }
    
    setLoading(true)
    setLoadingTip("Pushing to services...")
    
    try {
      const results = await executeWorkflow(servicesConfig, dataToSend)
      const failed = results.filter(r => !r.success)
      
      if (failed.length > 0) {
        throw new Error(`${failed.length} service(s) failed. Check console for details.`)
      }
      
      messageApi.success("Pushed to services successfully!")
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      messageApi.error("Error: " + errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Service Management Handlers
  const handleAddService = () => {
    setEditingIndex(null)
    form.resetFields()
    // Default values
    form.setFieldsValue({
      server_type: "http",
      is_open: true,
      config: JSON.stringify({
        url: "",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {}
      }, null, 2)
    })
    setIsModalOpen(true)
  }

  const handleEditService = (index: number) => {
    const service = servicesConfig[index]
    setEditingIndex(index)
    form.setFieldsValue({
      name: service.name,
      description: service.description,
      server_type: service.server_type,
      is_open: service.is_open,
      config: JSON.stringify(service.config, null, 2)
    })
    setIsModalOpen(true)
  }

  const handleDeleteService = (index: number) => {
    const newServices = [...servicesConfig]
    newServices.splice(index, 1)
    setServicesConfig(newServices)
    messageApi.success("Service deleted")
  }

  const handleToggleService = (index: number, checked: boolean) => {
    const newServices = [...servicesConfig]
    newServices[index] = { ...newServices[index], is_open: checked }
    setServicesConfig(newServices)
  }

  const handleSaveService = async () => {
    try {
      const values = await form.validateFields()
      let parsedConfig = {}
      try {
        parsedConfig = JSON.parse(values.config)
      } catch (e) {
        throw new Error("Invalid JSON in Config field")
      }

      const newService: PushService = {
        name: values.name,
        description: values.description,
        server_type: values.server_type,
        is_open: values.is_open,
        config: parsedConfig
      }

      const newServices = [...servicesConfig]
      if (editingIndex !== null) {
        newServices[editingIndex] = newService
      } else {
        newServices.push(newService)
      }
      
      setServicesConfig(newServices)
      setIsModalOpen(false)
      messageApi.success(editingIndex !== null ? "Service updated" : "Service added")
    } catch (e: unknown) {
       const errorMessage = e instanceof Error ? e.message : String(e)
       messageApi.error(errorMessage)
    }
  }

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
            <Title level={5} style={{ margin: 0, color: '#1677ff' }}>{chrome.i18n.getMessage("extensionName")}</Title>
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
                  <Button icon={<RocketOutlined />} size="small" onClick={() => handleExtract("smart")}>{chrome.i18n.getMessage("smartExtract")}</Button>
                </Tooltip>
                <Tooltip title="Full page HTML">
                  <Button icon={<FileTextOutlined />} size="small" onClick={() => handleExtract("full")}>{chrome.i18n.getMessage("fullPage")}</Button>
                </Tooltip>
                <Tooltip title="Selected text">
                  <Button icon={<ScissorOutlined />} size="small" onClick={() => handleExtract("selected")}>{chrome.i18n.getMessage("selectedText")}</Button>
                </Tooltip>
                <Tooltip title="Select element on page">
                  <Button icon={<SelectOutlined />} size="small" onClick={() => handleExtract("selection")}>{chrome.i18n.getMessage("pickElement")}</Button>
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
                  { key: 'services', label: chrome.i18n.getMessage("pushServices") },
                  { key: 'language', label: chrome.i18n.getMessage("language")},
                  { key: 'about', label: chrome.i18n.getMessage("aboutUs") },
                ]}
              />
            </Sider>
            <Content style={{ padding: 16, overflowY: 'auto', background: isDarkMode ? '#000' : '#fff' }}>
              {activeSetting === 'services' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0 }}>{chrome.i18n.getMessage("pushServices")}</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddService}>Add Service</Button>
                  </div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Available variables: <Text code>$main_text</Text>, <Text code>$source_url</Text>, <Text code>$web_title</Text>, <Text code>$author</Text>
                  </Text>
                  
                  <List
                    dataSource={servicesConfig}
                    renderItem={(item, index) => (
                      <List.Item
                        actions={[
                          <Switch 
                            checked={item.is_open} 
                            onChange={(checked) => handleToggleService(index, checked)} 
                            size="small"
                          />,
                          <Button type="text" icon={<EditOutlined />} onClick={() => handleEditService(index)} />,
                          <Popconfirm title="Delete service?" onConfirm={() => handleDeleteService(index)}>
                             <Button type="text" danger icon={<DeleteOutlined />} />
                          </Popconfirm>
                        ]}
                      >
                        <List.Item.Meta
                          title={
                            <Space>
                              {item.name}
                              <Tag color="blue">{item.server_type}</Tag>
                            </Space>
                          }
                          description={item.description}
                        />
                      </List.Item>
                    )}
                  />

                  <Modal
                    title={editingIndex !== null ? "Edit Service" : "Add Service"}
                    open={isModalOpen}
                    onOk={handleSaveService}
                    onCancel={() => setIsModalOpen(false)}
                    width={600}
                  >
                    <Form
                      form={form}
                      layout="vertical"
                      initialValues={{ server_type: 'http', is_open: true }}
                    >
                      <Form.Item
                        name="name"
                        label="Service Name"
                        rules={[{ required: true, message: 'Please enter service name' }]}
                      >
                        <Input placeholder="e.g. My Obsidian" />
                      </Form.Item>
                      
                      <Form.Item
                        name="description"
                        label="Description"
                      >
                        <Input placeholder="e.g. Push to local obsidian server" />
                      </Form.Item>
                      
                      <Form.Item
                         name="is_open"
                         valuePropName="checked"
                         label="Enabled"
                      >
                         <Switch />
                      </Form.Item>

                      <Form.Item
                        name="server_type"
                        label="Server Type"
                        rules={[{ required: true }]}
                      >
                        <Select options={[{ value: 'http', label: 'HTTP Request' }]} />
                      </Form.Item>

                      <Form.Item
                        name="config"
                        label="Configuration (JSON)"
                        rules={[
                          { required: true, message: 'Please enter configuration' },
                          { 
                            validator: (_, value) => {
                               try {
                                  JSON.parse(value)
                                  return Promise.resolve()
                               } catch (e) {
                                  return Promise.reject(new Error("Invalid JSON"))
                               }
                            }
                          }
                        ]}
                      >
                        <TextArea rows={10} style={{ fontFamily: 'monospace' }} />
                      </Form.Item>
                    </Form>
                  </Modal>
                </>
              )}
              {activeSetting === 'language' && (
                <div>
                  <Title level={5}>{chrome.i18n.getMessage("language")}</Title>
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
                  <Title level={5}>{chrome.i18n.getMessage("aboutUs")}</Title>
                  <Text strong>{chrome.i18n.getMessage("extensionName")}</Text>
                  <br/>
                  <Text type="secondary">{chrome.i18n.getMessage("version")}: 0.0.1</Text>
                  <br/><br/>
                  <Text>{chrome.i18n.getMessage("extensionDescription")}</Text>
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
               <Tooltip title={chrome.i18n.getMessage("clear")}>
                  <Button danger icon={<DeleteOutlined />} onClick={handleClear} />
               </Tooltip>
               <Tooltip title={chrome.i18n.getMessage("copy")}>
                  <Button icon={<CopyOutlined />} onClick={handleCopy} />
               </Tooltip>
               <Tooltip title={chrome.i18n.getMessage("download")}>
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
              {chrome.i18n.getMessage("executePush")}
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
