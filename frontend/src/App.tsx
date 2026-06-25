import { CheckOutlined, CloudServerOutlined, DeleteOutlined, EditOutlined, FolderOpenOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, ConfigProvider, Empty, Flex, Input, Select, Space, Typography, message, theme } from 'antd';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import type { MouseEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type NodeVersion = {
  version: string;
};

type DirectoryShortcut = {
  id: string;
  path: string;
};

const { Text, Title } = Typography;
const expandedSize = { width: 400, height: 355 };
const collapsedSize = { width: 56, height: 56 };
const animationDurationMs = 180;
const directoryStorageKey = 'bubble.quickDirectories';

function App() {
  const [versions, setVersions] = useState<NodeVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>();
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);
  const [directories, setDirectories] = useState<DirectoryShortcut[]>(() => loadDirectories());
  const [directoryPath, setDirectoryPath] = useState('');
  const [editingDirectoryId, setEditingDirectoryId] = useState<string>();
  const [editingDirectoryPath, setEditingDirectoryPath] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const animationTokenRef = useRef(0);
  const currentSizeRef = useRef(expandedSize);
  const isInteractingRef = useRef(false);
  const hasLoadedVersionsRef = useRef(false);
  const [messageApi, contextHolder] = message.useMessage();

  const loadNodeVersions = useCallback(async () => {
    if (hasLoadedVersionsRef.current) {
      return;
    }

    hasLoadedVersionsRef.current = true;
    setIsLoadingVersions(true);

    try {
      const nextVersions = await invoke<NodeVersion[]>('list_node_versions');
      setVersions(nextVersions);
      setSelectedVersion((current) => current ?? nextVersions[0]?.version);

      if (nextVersions.length === 0) {
        messageApi.warning('No nvm Node versions found');
      }
    } catch (error) {
      messageApi.error(toErrorMessage(error));
    } finally {
      setIsLoadingVersions(false);
    }
  }, [messageApi]);

  useEffect(() => {
    void loadNodeVersions();
  }, [loadNodeVersions]);

  useEffect(() => {
    localStorage.setItem(directoryStorageKey, JSON.stringify(directories));
  }, [directories]);

  const animateToSize = useCallback((targetSize: WindowSize) => {
    if (!isTauriRuntime()) {
      currentSizeRef.current = targetSize;
      return;
    }

    const startSize = currentSizeRef.current;
    const token = animationTokenRef.current + 1;
    animationTokenRef.current = token;
    const startedAt = performance.now();

    const step = (now: number) => {
      if (animationTokenRef.current !== token) {
        return;
      }

      const progress = Math.min((now - startedAt) / animationDurationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextSize = {
        width: Math.round(startSize.width + (targetSize.width - startSize.width) * eased),
        height: Math.round(startSize.height + (targetSize.height - startSize.height) * eased)
      };

      currentSizeRef.current = nextSize;
      void resizeWindow(nextSize);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        currentSizeRef.current = targetSize;
        void resizeWindow(targetSize);
      }
    };

    requestAnimationFrame(step);
  }, []);

  const handleExpand = useCallback(() => {
    if (!isTauriRuntime() || !isCollapsed) {
      return;
    }

    setIsCollapsed(false);
    animateToSize(expandedSize);
  }, [animateToSize, isCollapsed]);

  const handleCollapse = useCallback(() => {
    if (!isTauriRuntime() || isCollapsed || isInteractingRef.current) {
      return;
    }

    setIsCollapsed(true);
    animateToSize(collapsedSize);
  }, [animateToSize, isCollapsed]);

  const handleWindowDrag = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!isTauriRuntime() || event.button !== 0) {
      return;
    }

    if ((event.target as HTMLElement).closest('button, input, textarea, [role="combobox"], .ant-select-dropdown')) {
      return;
    }

    void getCurrentWindow().startDragging().catch(() => undefined);
  }, []);

  const handleVersionChange = useCallback(
    async (version: string) => {
      setSelectedVersion(version);
      setIsSwitchingVersion(true);

      try {
        await invoke('switch_node_version', { version });
        messageApi.success(`Node ${version} selected`);
      } catch (error) {
        messageApi.error(toErrorMessage(error));
      } finally {
        setIsSwitchingVersion(false);
      }
    },
    [messageApi]
  );

  const handleAddDirectory = useCallback(() => {
    const path = directoryPath.trim();

    if (!path) {
      messageApi.warning('Enter a folder path');
      return;
    }

    setDirectories((current) => {
      if (current.some((directory) => directory.path === path)) {
        return current;
      }

      return [{ id: crypto.randomUUID(), path }, ...current].slice(0, 4);
    });
    setDirectoryPath('');
  }, [directoryPath, messageApi]);

  const handleStartEditDirectory = useCallback((directory: DirectoryShortcut) => {
    isInteractingRef.current = true;
    setEditingDirectoryId(directory.id);
    setEditingDirectoryPath(directory.path);
  }, []);

  const handleSaveDirectory = useCallback(() => {
    if (!editingDirectoryId) {
      return;
    }

    const path = editingDirectoryPath.trim();

    if (!path) {
      messageApi.warning('Enter a folder path');
      return;
    }

    setDirectories((current) =>
      current.map((directory) => (directory.id === editingDirectoryId ? { ...directory, path } : directory))
    );
    setEditingDirectoryId(undefined);
    setEditingDirectoryPath('');
    isInteractingRef.current = false;
  }, [editingDirectoryId, editingDirectoryPath, messageApi]);

  const handleDeleteDirectory = useCallback((id: string) => {
    setDirectories((current) => current.filter((directory) => directory.id !== id));

    if (editingDirectoryId === id) {
      setEditingDirectoryId(undefined);
      setEditingDirectoryPath('');
    }
  }, [editingDirectoryId]);

  const openDirectory = useCallback(
    async (path: string) => {
      try {
        await invoke('open_folder', { path });
      } catch (error) {
        messageApi.error(toErrorMessage(error));
      }
    },
    [messageApi]
  );

  const versionOptions = useMemo(
    () =>
      versions.map(({ version }) => ({
        label: version,
        value: version
      })),
    [versions]
  );

  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          borderRadius: 6,
          colorPrimary: '#1677ff',
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }
      }}
    >
      {contextHolder}
      <main
        className={`floating-shell ${isCollapsed ? 'is-collapsed' : 'is-expanded'}`}
        onMouseDown={handleWindowDrag}
        onMouseEnter={handleExpand}
        onMouseLeave={handleCollapse}
      >
        <header className="app-header">
          <div className="window-icon" aria-label="Bubble">
            <CloudServerOutlined className="brand-icon" />
          </div>
          <div className="header-copy">
            <Title level={1}>Quick Tools</Title>
            <Text className="eyebrow">Developer Float</Text>
          </div>
        </header>

        <section className="app-content">
          <Space direction="vertical" size={12} className="tool-content">
            <section className="tool-section node-section">
              <Text className="section-title">Node version</Text>
              <Select
                className="node-select"
                getPopupContainer={(triggerNode) => triggerNode.parentElement ?? document.body}
                listHeight={112}
                loading={isLoadingVersions || isSwitchingVersion}
                options={versionOptions}
                placeholder="Select nvm version"
                popupClassName="node-version-popup"
                value={selectedVersion}
                onChange={(version) => void handleVersionChange(version)}
                onDropdownVisibleChange={(open) => {
                  isInteractingRef.current = open;
                }}
              />
            </section>

            <section className={`tool-section folder-section ${directories.length === 0 ? 'is-empty' : ''}`}>
              <Text className="section-title">Folders</Text>
              <Flex gap={8}>
                <Input
                  className="folder-input"
                  placeholder="/path/to/folder"
                  value={directoryPath}
                  onChange={(event) => setDirectoryPath(event.target.value)}
                  onPressEnter={handleAddDirectory}
                />
                <Button icon={<PlusOutlined />} onClick={handleAddDirectory} />
              </Flex>
              <div className="folder-list">
                {directories.length === 0 && <Empty description="No folders" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                {directories.map((directory) => {
                  const isEditing = editingDirectoryId === directory.id;

                  return (
                    <div key={directory.id} className="folder-row">
                      {isEditing ? (
                        <Input
                          className="folder-edit-input"
                          value={editingDirectoryPath}
                          onChange={(event) => setEditingDirectoryPath(event.target.value)}
                          onPressEnter={handleSaveDirectory}
                          onFocus={() => {
                            isInteractingRef.current = true;
                          }}
                          onBlur={() => {
                            isInteractingRef.current = false;
                          }}
                        />
                      ) : (
                        <button
                          className="folder-path"
                          type="button"
                          title={directory.path}
                          onClick={() => void openDirectory(directory.path)}
                        >
                          <FolderOpenOutlined />
                          <span>{directory.path}</span>
                        </button>
                      )}
                      <div className="folder-actions">
                        {isEditing ? (
                          <Button
                            className="icon-action"
                            icon={<CheckOutlined />}
                            type="text"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={handleSaveDirectory}
                          />
                        ) : (
                          <Button
                            className="icon-action"
                            icon={<EditOutlined />}
                            type="text"
                            onClick={() => handleStartEditDirectory(directory)}
                          />
                        )}
                        <Button
                          className="icon-action danger-action"
                          icon={<DeleteOutlined />}
                          type="text"
                          onClick={() => handleDeleteDirectory(directory.id)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </Space>
        </section>
      </main>
    </ConfigProvider>
  );
}

function loadDirectories() {
  try {
    const stored = localStorage.getItem(directoryStorageKey);
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored) as DirectoryShortcut[];
    return Array.isArray(parsed) ? parsed.filter((directory) => directory.id && directory.path) : [];
  } catch {
    return [];
  }
}

function toErrorMessage(error: unknown) {
  return typeof error === 'string' ? error : error instanceof Error ? error.message : 'Unexpected error';
}

type WindowSize = {
  width: number;
  height: number;
};

async function resizeWindow(size: WindowSize) {
  if (!isTauriRuntime()) {
    return;
  }

  await getCurrentWindow().setSize(new LogicalSize(size.width, size.height));
}

function isTauriRuntime() {
  return '__TAURI_INTERNALS__' in window;
}

export default App;
