/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, useEffect, useRef, useState, type ErrorInfo, type ReactNode } from "react"
import Vditor from "vditor"
import "vditor/dist/index.css"
import { useStorage } from "@plasmohq/storage/hook"
import { localStorage, syncStorage } from "~lib/storage"
import { getServiceOptions, getServiceTemplate } from "~server_template"
import type { ExtractedData, ExtractMode, PushService } from "~lib/types"
import { useI18n, type Locale } from "~lib/i18n"
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
  Popconfirm,
  Tag
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
  EditOutlined,
  RobotOutlined,
  LinkOutlined,
  CloseOutlined
} from "@ant-design/icons"

import "~style.css"

import { replaceVariables } from "~lib/variable-replacer"
import { executeWorkflow } from "~lib/workflow"
import copy from "copy-to-clipboard"

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
    name: "http demo",
    description: "http demo",
    is_open: false,
    server_type: "http",
    config: {
      url: "https://test.demo.com/post",
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
  },
  {
    name: "太初y",
    description: "从最初问题开始构建智慧",
    is_open: false,
    server_type: "taichuy",
    config: {
      apiKey: ""
    }
  }
]

const SidePanelContent = () => {
  const { t, lang: userLanguage, setLang: setUserLanguage } = useI18n()

  const [currentClip, setCurrentClip] = useStorage<ExtractedData | null>({
    key: "current_clip",
    instance: localStorage
  })
  const [servicesConfig, setServicesConfig] = useStorage<PushService[]>({
    key: "services_config",
    instance: syncStorage
  }, DEFAULT_SERVICES)

  const [aiPromptTemplate, setAiPromptTemplate] = useStorage<string>({
    key: "ai_prompt_template",
    instance: syncStorage
  }, "$main_text\n\n将上述内容整理为一个完整文章")
  
  const [view, setView] = useState<"editor" | "settings">("editor")
  const [activeSetting, setActiveSetting] = useState("services")
  const [loading, setLoading] = useState(false)
  const [loadingTip, setLoadingTip] = useState("")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isVditorReady, setIsVditorReady] = useState(false)
  const [createdArticleLinks, setCreatedArticleLinks] = useState<string[]>([])
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form] = Form.useForm()
  const serverType = Form.useWatch('server_type', form)

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
              "preview"
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
        // Reset lastProcessedContent so that when we return to editor, content is re-injected
        lastProcessedContent.current = null
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
    setCreatedArticleLinks([])
    messageApi.success(t("editorCleared"))
  }

  const handleCopy = () => {
    if (!isVditorReady) return
    const content = vditorRef.current?.getValue() || ""
    if (!content) {
      messageApi.warning(t("noContentToCopy"))
      return
    }
    try {
      if (copy(content)) {
        messageApi.success(t("copiedToClipboard"))
      } else {
        throw new Error("Copy failed")
      }
    } catch (err) {
      console.error(err)
      messageApi.error(t("failedToCopy"))
    }
  }

  const handleDownload = () => {
    if (!isVditorReady) return
    const content = vditorRef.current?.getValue() || ""
    if (!content) {
      messageApi.warning(t("noContentToDownload"))
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
      messageApi.success(t("downloadStarted"))
    } catch (err) {
      console.error(err)
      messageApi.error(t("failedToDownload"))
    }
  }

  const handleCopyToAI = () => {
    if (!currentClip) {
       messageApi.warning(t("noContentAvailable"))
       return
    }
    
    const content = (isVditorReady && vditorRef.current) ? vditorRef.current.getValue() : currentClip.content
    const variables: Record<string, string> = {
      $main_text: content,
      $source_url: currentClip.url,
      $web_title: currentClip.title,
      $author: currentClip.author || "",
      $published_time: currentClip.publishedTime || ""
    }
    
    try {
      const textToCopy = replaceVariables(aiPromptTemplate, variables) as string
      if (copy(textToCopy)) {
        messageApi.success(t("copiedAIPrompt"))
      } else {
        throw new Error("Copy failed")
      }
    } catch (err) {
      console.error(err)
      messageApi.error(t("failedToCopy"))
    }
  }

  const handleExtract = async (mode: ExtractMode) => {
    setLoading(true)
    setLoadingTip(t("extractingContent"))
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
         throw new Error(t("noActiveTab"))
      }
      
      // Check if we can inject script/send message (avoid chrome:// urls)
      if (tab.url?.startsWith("chrome://") || tab.url?.startsWith("edge://") || tab.url?.startsWith("about:")) {
         throw new Error(t("cannotClipSystem"))
      }

      if (mode === "selection") {
        setLoadingTip(t("pleaseSelectElement"))
        try {
          await chrome.tabs.sendMessage(tab.id, { action: "extract", mode: "selection" })
        } catch (err) {
           const errorMessage = err instanceof Error ? err.message : String(err)
           if (errorMessage.includes("Could not establish connection")) {
              throw new Error(t("refreshPage"))
           }
           throw err
        }
        return
      }

      try {
        const response = await chrome.tabs.sendMessage(tab.id, { action: "extract", mode })
        if (response.status === "success") {
          setCurrentClip(response.data)
          messageApi.success(t("extractedSuccessfully"))
        } else {
          throw new Error(response.message || t("extractionFailed"))
        }
      } catch (err: unknown) {
         const errorMessage = err instanceof Error ? err.message : String(err)
         if (errorMessage.includes("Could not establish connection")) {
            throw new Error(t("refreshPage"))
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
    
    // Clear previous links
    setCreatedArticleLinks([])

    const content = (isVditorReady && vditorRef.current) ? vditorRef.current.getValue() : currentClip.content
    const dataToSend = { ...currentClip, content }
    
    setLoading(true)
    setLoadingTip(t("pushingToServices"))
    
    try {
      const results = await executeWorkflow(servicesConfig, dataToSend)
      const failed = results.filter(r => !r.success)
      
      // Extract links from successful results
      const newLinks: string[] = []
      results.forEach(r => {
        if (r.success && r.serverType === 'taichuy' && r.data?.data?.id) {
          newLinks.push(`https://y.taichu.xyz/article?id=${r.data.data.id}&type=my`)
        }
      })
      
      if (newLinks.length > 0) {
        setCreatedArticleLinks(newLinks)
      }
      
      if (failed.length > 0) {
        throw new Error(t("serviceFailed", { n: failed.length }))
      }
      
      messageApi.success(t("pushSuccess"))
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
    const defaultType = 'http'
    const template = getServiceTemplate(defaultType)
    
    form.setFieldsValue({
      server_type: defaultType,
      is_open: true,
      name: template.defaultName || '',
      description: template.defaultDescription || '',
      ...template.processConfigForEdit(DEFAULT_SERVICES[0].config) // Or empty config
    })
    
    // Explicitly set default config for http if needed, or rely on form default
    if (defaultType === 'http') {
       form.setFieldsValue({
          config: JSON.stringify({
            url: "",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: {}
          }, null, 2)
       })
    }
    
    setIsModalOpen(true)
  }

  const handleEditService = (index: number) => {
    const service = servicesConfig[index]
    setEditingIndex(index)
    
    const template = getServiceTemplate(service.server_type)
    
    const initialValues: any = {
      name: service.name,
      description: service.description,
      server_type: service.server_type,
      is_open: service.is_open,
      ...template.processConfigForEdit(service.config)
    }

    form.setFieldsValue(initialValues)
    setIsModalOpen(true)
  }

  const handleDeleteService = (index: number) => {
    const newServices = [...servicesConfig]
    newServices.splice(index, 1)
    setServicesConfig(newServices)
    messageApi.success("Service deleted")
  }

  const handleToggleService = (index: number, checked: boolean) => {
    if (checked) {
      const service = servicesConfig[index]
      const template = getServiceTemplate(service.server_type)
      if (template.validate && !template.validate(service.config)) {
         messageApi.warning("请先完善服务配置信息")
         handleEditService(index)
         return
      }
    }

    const newServices = [...servicesConfig]
    newServices[index] = { ...newServices[index], is_open: checked }
    setServicesConfig(newServices)
  }

  const handleSaveService = async () => {
    try {
      const values = await form.validateFields()
      const template = getServiceTemplate(values.server_type)
      
      let parsedConfig = {}
      try {
        parsedConfig = template.processConfigBeforeSave(values)
      } catch (e: unknown) {
         const errorMessage = e instanceof Error ? e.message : String(e)
         throw new Error(errorMessage)
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

  const handleCloseLink = (indexToRemove: number) => {
    setCreatedArticleLinks(prev => prev.filter((_, index) => index !== indexToRemove))
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
            <Title level={5} style={{ margin: 0, color: '#1677ff' }}>{t("extensionName")}</Title>
          </div>
          <div>
            <Tooltip title={view === "editor" ? t("settings") : t("backToEditor")}>
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
              message={t("somethingWentWrong")}
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
                <Tooltip title={t("autoDetectContent")}>
                  <Button icon={<RocketOutlined />} size="small" onClick={() => handleExtract("smart")}>{t("smartExtract")}</Button>
                </Tooltip>
                <Tooltip title={t("fullPageHTML")}>
                  <Button icon={<FileTextOutlined />} size="small" onClick={() => handleExtract("full")}>{t("fullPage")}</Button>
                </Tooltip>
                <Tooltip title={t("selectedText")}>
                  <Button icon={<ScissorOutlined />} size="small" onClick={() => handleExtract("selected")}>{t("selectedText")}</Button>
                </Tooltip>
                <Tooltip title={t("selectElementOnPage")}>
                  <Button icon={<SelectOutlined />} size="small" onClick={() => handleExtract("selection")}>{t("pickElement")}</Button>
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

            {createdArticleLinks.length > 0 && (
              <div style={{ 
                padding: '8px 16px', 
                borderTop: `1px solid ${isDarkMode ? '#303030' : '#f0f0f0'}`,
                background: isDarkMode ? '#141414' : '#fafafa'
              }}>
                 <Space direction="vertical" style={{ width: '100%' }}>
                   {createdArticleLinks.map((link, index) => (
                     <div
                       key={index}
                       style={{
                         position: 'relative',
                         padding: '8px 24px 8px 12px',
                         borderRadius: 4,
                         backgroundColor: isDarkMode ? '#162312' : '#f6ffed',
                         border: `1px solid ${isDarkMode ? '#274916' : '#b7eb8f'}`,
                       }}
                     >
                       <a 
                         href={link} 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         style={{ 
                           display: 'flex', 
                           alignItems: 'flex-start', 
                           gap: 8,
                           color: isDarkMode ? '#49aa19' : '#52c41a',
                           wordBreak: 'break-all',
                           fontSize: '13px',
                           lineHeight: 1.5
                         }}
                       >
                         <LinkOutlined style={{ marginTop: 4, flexShrink: 0 }} /> 
                         {link}
                       </a>
                       <div 
                         role="button"
                         tabIndex={0}
                         onClick={() => handleCloseLink(index)}
                         style={{
                           position: 'absolute',
                           top: 4,
                           right: 4,
                           cursor: 'pointer',
                           padding: 4,
                           lineHeight: 0,
                           color: isDarkMode ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)'
                         }}
                       >
                         <CloseOutlined style={{ fontSize: 10 }} />
                       </div>
                     </div>
                   ))}
                 </Space>
              </div>
            )}
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
                  { key: 'services', label: t("pushServices") },
                  { key: 'ai_settings', label: t("aiSettings") },
                  { key: 'language', label: t("language")},
                  { key: 'about', label: t("aboutUs") },
                ]}
              />
            </Sider>
            <Content style={{ padding: 16, overflowY: 'auto', background: isDarkMode ? '#000' : '#fff' }}>
              {activeSetting === 'services' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <Title level={5} style={{ margin: 0 }}>{t("pushServices")}</Title>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleAddService}>{t("addService")}</Button>
                  </div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    {t("availableVariables")} <Text code>$main_text</Text>, <Text code>$source_url</Text>, <Text code>$web_title</Text>, <Text code>$author</Text>
                  </Text>
                  
                  <List
                    dataSource={servicesConfig}
                    renderItem={(item, index) => (
                      <List.Item
                        actions={[
                          <Switch 
                            key="switch"
                            checked={item.is_open} 
                            onChange={(checked) => handleToggleService(index, checked)} 
                            size="small"
                          />,
                          <Button key="edit" type="text" icon={<EditOutlined />} onClick={() => handleEditService(index)} />,
                          <Popconfirm key="delete" title={t("deleteServiceConfirm")} onConfirm={() => handleDeleteService(index)}>
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
                    title={editingIndex !== null ? t("editService") : t("addService")}
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
                        label={t("serviceName")}
                        rules={[{ required: true, message: t("pleaseEnterServiceName") }]}
                      >
                        <Input placeholder="e.g. My Obsidian" />
                      </Form.Item>
                      
                      <Form.Item
                        name="description"
                        label={t("serviceDescription")}
                      >
                        <Input placeholder="e.g. Push to local obsidian server" />
                      </Form.Item>
                      
                      <Form.Item
                         name="is_open"
                         valuePropName="checked"
                         label={t("serviceEnabled")}
                      >
                         <Switch />
                      </Form.Item>

                      <Form.Item
                        name="server_type"
                        label={t("serverType")}
                        rules={[{ required: true }]}
                      >
                        <Select 
                          options={getServiceOptions()} 
                          onChange={(value) => {
                            const template = getServiceTemplate(value)
                            form.setFieldsValue({ 
                               server_type: value,
                               name: template.defaultName || '',
                               description: template.defaultDescription || ''
                            })
                          }}
                        />
                      </Form.Item>

                      {(() => {
                        const template = getServiceTemplate(serverType || 'http')
                        const FormItems = template.FormItems
                        return <FormItems />
                      })()}
                    </Form>
                  </Modal>
                </>
              )}
              {activeSetting === 'ai_settings' && (
                <div>
                  <Title level={5}>{t("aiPromptConfig")}</Title>
                  <Alert
                     message={t("variableDescription")}
                     description={
                       <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                         <div>• {t("variableDescMainText")}</div>
                         <div>• {t("variableDescWebTitle")}</div>
                         <div>• {t("variableDescSourceUrl")}</div>
                       </div>
                     }
                     type="info"
                     showIcon={false}
                     style={{ marginBottom: 16 }}
                  />
                  <TextArea
                    rows={10}
                    value={aiPromptTemplate}
                    onChange={(e) => setAiPromptTemplate(e.target.value)}
                    placeholder={t("aiPromptPlaceholder")}
                    style={{ fontFamily: 'monospace' }}
                  />
                </div>
              )}
              {activeSetting === 'language' && (
                <div>
                  <Title level={5}>{t("language")}</Title>
                  <Select 
                    value={userLanguage}
                    onChange={(val) => setUserLanguage(val as Locale)}
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
                  <Text strong>{t("extensionName")}</Text>
                  <br/>
                  <Text type="secondary">{t("version")}: {chrome.runtime.getManifest().version}</Text>
                  <br/><br/>
                  <Text>{t("extensionDescription")}2</Text>
                  <div style={{ marginTop: 24 }}>
                    <Text strong style={{ fontSize: '12px' }}>{t("storyTitle")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Text type="secondary" style={{ fontSize: '12px', whiteSpace: 'pre-line' }}>{t("storyContent")}</Text>
                    </div>
                  </div>
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
               <Tooltip title={t("copy")}>
                  <Button icon={<CopyOutlined />} onClick={handleCopy} />
               </Tooltip>
              <Tooltip title={t("copyToAI")}>
                  <Button icon={<RobotOutlined />} onClick={handleCopyToAI} />
               </Tooltip>
               <Tooltip title={t("download")}>
                  <Button icon={<DownloadOutlined />} onClick={handleDownload} />
               </Tooltip>
               <Tooltip title={t("clear")}>
                  <Button danger icon={<DeleteOutlined />} onClick={handleClear} />
               </Tooltip>
            </Space>
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={handleSend}
              loading={loading}
              disabled={!currentClip}
            >
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
