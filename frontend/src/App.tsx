import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Card,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { main } from "../wailsjs/go/models";
import * as runtime from "../wailsjs/runtime/runtime";
type Task = main.Task;

// Helper to render markdown safely (marked may return string or Promise<string> depending on build)
const renderMarkdownToHtml = (s: string) => {
  // Ensure we always pass a string to DOMPurify
  const html = String(marked.parse(s || ""));
  return DOMPurify.sanitize(html);
};

function App() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newTaskContent, setNewTaskContent] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // 根据任务位置返回对应的颜色，颜色随 x、y 增大而加深
  const getTaskColor = (x: number, y: number) => {
    // 原点为 (0, 0)，左下角为 (0, 0)，右上角为 (100, 100)
    // x 越大，重要性越大（越靠右）
    // y 越大，紧急性越大（越靠上，但在 CSS 中 top 越小越靠上）
    const isRightSide = x > 50; // 重要性
    const isTopSide = y > 50; // 紧急性（y 越大越紧急，越靠上）

    // 计算颜色深度：x 和 y 越大，颜色越深
    // 将 x 和 y 映射到 0-1 范围，然后计算综合深度
    const xDepth = x / 100; // 0-1
    const yDepth = y / 100; // 0-1
    const depth = (xDepth + yDepth) / 2; // 综合深度 0-1

    // 使用增强函数让颜色变化更明显（非线性映射，但比平方更平滑）
    // 使用 1.5 次方，让变化更明显但不会太陡峭
    const enhancedDepth = Math.pow(depth, 2); // 0-1，变化更明显

    // 将深度映射到亮度范围：深度越大，亮度越小（颜色越深）
    // 背景亮度：从 100% 到 60%（深度越大，背景越深）- 让颜色更浅
    // 边框亮度：从 95% 到 65%（深度越大，边框越深）- 让颜色更浅
    // 饱和度：从 30% 到 70%（深度越大，饱和度越高）- 降低饱和度，让颜色更柔和
    const bgLightness = 100 - enhancedDepth * 40; // 100% -> 60%
    const borderLightness = 95 - enhancedDepth * 30; // 95% -> 65%
    const saturation = 30 + enhancedDepth * 40; // 30% -> 70%

    if (isRightSide && isTopSide) {
      // 紧急且重要 - 红色系
      return {
        background: `hsl(0, ${saturation}%, ${bgLightness}%)`,
        border: `1px solid hsl(0, ${saturation * 0.9}%, ${borderLightness}%)`,
        color: "#630a0a", // 深红色文字
      };
    } else if (!isRightSide && isTopSide) {
      // 紧急不重要 - 橙色系
      return {
        background: `hsl(30, ${saturation}%, ${bgLightness}%)`,
        border: `1px solid hsl(30, ${saturation * 0.9}%, ${borderLightness}%)`,
        color: "#ef6c00", // 深橙色文字
      };
    } else if (isRightSide && !isTopSide) {
      // 重要不紧急 - 蓝色系
      return {
        background: `hsl(210, ${saturation}%, ${bgLightness}%)`,
        border: `1px solid hsl(210, ${saturation * 0.9}%, ${borderLightness}%)`,
        color: "#1565c0", // 深蓝色文字
      };
    } else {
      // 不紧急不重要 - 灰色系（饱和度始终为0）
      return {
        background: `hsl(0, 0%, ${bgLightness}%)`,
        border: `1px solid hsl(0, 0%, ${borderLightness}%)`,
        color: "#616161", // 深灰色文字
      };
    }
  };

  // 加载保存的任务
  useEffect(() => {
    import("../wailsjs/go/main/App").then(({ LoadTasks }) => {
      LoadTasks()
        .then((savedTasks: Task[]) => {
          setTasks(savedTasks);
        })
        .catch((error: Error) => {
          console.error("Failed to load tasks:", error);
        });
    });
  }, []);

  // 当任务发生变化时保存
  useEffect(() => {
    if (tasks.length > 0) {
      import("../wailsjs/go/main/App").then(({ SaveTasks }) => {
        SaveTasks(tasks).catch((error: Error) => {
          console.error("Failed to save tasks:", error);
        });
      });
    }
  }, [tasks]);

  useEffect(() => {
    if (openDialog) {
      // 延迟一帧，确保 TextField 已挂载，然后 focus
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [openDialog]);

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{
    mouseX: number;
    mouseY: number;
    taskX: number;
    taskY: number;
  } | null>(null);
  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    taskId: string
  ) => {
    setDraggingTaskId(taskId);
    const target = e.currentTarget as HTMLElement;
    target.style.opacity = "0.6";

    // 创建一个1x1的透明图像作为拖动时的图标
    const img = new Image();
    img.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    e.dataTransfer.setDragImage(img, 0, 0);

    // 记录开始拖动时的位置信息和卡片宽度
    const container = document.getElementById("matrix-container");
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    setDragStartPos({
      mouseX: e.clientX,
      mouseY: e.clientY,
      taskX: task.x,
      taskY: task.y,
    });
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggingTaskId || !dragStartPos) return;

    const container = document.getElementById("matrix-container");
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // 计算鼠标移动的距离（转换为百分比）
    // x 轴：鼠标向右移动，x 增大（重要性增大）
    const deltaX = ((e.clientX - dragStartPos.mouseX) / rect.width) * 100;
    // y 轴：鼠标向上移动（clientY 减小），y 增大（紧急性增大）
    // 因为 CSS 中 top 越小越靠上，而 y 值越大越靠上
    const deltaY = ((dragStartPos.mouseY - e.clientY) / rect.height) * 100;

    // 基于原始位置计算新位置
    const newX = dragStartPos.taskX + deltaX;
    const newY = dragStartPos.taskY + deltaY;

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === draggingTaskId
          ? {
              ...task,
              x: Math.max(0, Math.min(100, newX)),
              y: Math.max(0, Math.min(100, newY)),
            }
          : task
      )
    );
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (draggingTaskId) {
      const target = e.currentTarget as HTMLElement;
      target.style.opacity = "1";

      setDraggingTaskId(null);
      setDragStartPos(null);
    }
  };

  const addTask = () => {
    if (!newTaskContent.trim()) return;

    const newTask: Task = {
      id: Date.now().toString(),
      content: newTaskContent,
      x: 0,
      y: 0,
    };

    setTasks([...tasks, newTask]);
    setNewTaskContent("");
    setOpenDialog(false);
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
  };

  return (
    <Box
      sx={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        p: 3,
        backgroundColor: "#f5f5f5",
        overflow: "hidden",
      }}
    >
      <Typography
        variant="h4"
        sx={{ mb: 3, color: "#1a237e", fontWeight: "bold" }}
      >
        任务优先级矩阵
      </Typography>

      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={() => setOpenDialog(true)}
        sx={{
          mb: 2,
          alignSelf: "flex-start",
          backgroundColor: "#1a237e",
          "&:hover": {
            backgroundColor: "#0d47a1",
          },
        }}
      >
        添加任务
      </Button>

      <Paper
        id="matrix-container"
        elevation={3}
        sx={{
          flex: 1,
          position: "relative",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 2,
          p: 2,
          backgroundColor: "#ffffff",
          borderRadius: 2,
          overflow: "visible",
        }}
      >
        <Box
          onDragOver={(e) => {
            e.preventDefault();
            handleDrag(e);
          }}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            overflow: "visible",
          }}
        >
          {tasks.map((task) => (
            <Card
              key={task.id}
              ref={(el) => {
                cardRefs.current[task.id] = el;
              }}
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              sx={{
                position: "absolute",
                left: `${task.x}%`,
                top: `${100 - task.y}%`, // y 越大越靠上，但 CSS 中 top 越小越靠上
                transform: "translate(-50%, -50%)",
                display: "inline-block",
                minWidth: 80,
                maxWidth: "none",
                width: "fit-content",
                flexShrink: 0,
                boxSizing: "border-box",
                p: 1.5,
                pt: 1.5,
                ...getTaskColor(task.x, task.y),
                // prevent content from wrapping, width adapts to content
                whiteSpace: "nowrap",
                overflow: "visible",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                zIndex: 2,
                borderRadius: 1.5,
                transition:
                  draggingTaskId === task.id ? "none" : "all 0.2s ease-in-out",
                userSelect: "none",
                cursor: "move",
                "&:hover .delete-button": {
                  opacity: 0.8,
                },
              }}
            >
              <IconButton
                className="delete-button"
                size="medium"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTask(task.id);
                }}
                sx={{
                  position: "absolute",
                  right: "4px",
                  top: "4px",
                  padding: 0.2,
                  opacity: 0,
                  transition: "opacity 0.2s ease-in-out",
                  "& .MuiSvgIcon-root": {
                    fontSize: "0.875rem",
                    color: "#f44336",
                  },
                  "&:hover": {
                    backgroundColor: "rgba(244, 67, 54, 0.1)",
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
              <Box
                sx={{
                  width: "auto",
                  mt: 0.5,
                  fontSize: "0.9rem",
                  color: "inherit",
                  whiteSpace: "nowrap",
                  "& > div": {
                    textAlign: "left",
                    whiteSpace: "nowrap",
                    "& > *": {
                      textAlign: "left",
                      whiteSpace: "nowrap",
                    },
                    "& ul, & ol": {
                      margin: "0.3em 0",
                      listStylePosition: "inside",
                      whiteSpace: "nowrap",
                    },
                    "& li": {
                      display: "list-item",
                      paddingLeft: "0.3em",
                      marginBottom: "0.2em",
                      whiteSpace: "nowrap",
                    },
                    "& p": {
                      margin: "0.3em 0",
                      whiteSpace: "nowrap",
                    },
                    "& a": {
                      color: "inherit",
                      textDecoration: "underline",
                      whiteSpace: "nowrap",
                    },
                    "& code": {
                      backgroundColor: "rgba(0, 0, 0, 0.05)",
                      padding: "0.1em 0.2em",
                      borderRadius: "2px",
                      fontSize: "0.9em",
                      whiteSpace: "nowrap",
                    },
                  },
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: renderMarkdownToHtml(task.content || ""),
                  }}
                />
              </Box>
            </Card>
          ))}
        </Box>

        {/* 象限分隔线 */}
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: "rgba(0,0,0,0.1)",
            zIndex: 0,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 1,
            backgroundColor: "rgba(0,0,0,0.1)",
            zIndex: 0,
          }}
        />

        {/* Y轴标签 */}
        <Typography
          sx={{
            position: "absolute",
            top: "2%",
            left: "50%",
            transform: "translate(-50%, 0)",
            color: "#1a237e",
            fontWeight: 500,
            padding: "2px 8px",
            fontSize: "0.85rem",
          }}
        >
          紧急
        </Typography>
        <Typography
          sx={{
            position: "absolute",
            bottom: "2%",
            left: "50%",
            transform: "translate(-50%, 0)",
            color: "#1a237e",
            fontWeight: 500,
            padding: "2px 8px",
            fontSize: "0.85rem",
          }}
        >
          不紧急
        </Typography>

        {/* X轴标签 */}
        <Typography
          sx={{
            position: "absolute",
            left: "2%",
            top: "50%",
            transform: "translate(0, -50%)",
            color: "#1a237e",
            fontWeight: 500,
            padding: "2px 8px",
            fontSize: "0.85rem",
          }}
        >
          不重要
        </Typography>
        <Typography
          sx={{
            position: "absolute",
            right: "2%",
            top: "50%",
            transform: "translate(0, -50%)",
            color: "#1a237e",
            fontWeight: 500,
            padding: "2px 8px",
            fontSize: "0.85rem",
          }}
        >
          重要
        </Typography>
      </Paper>

      {/* 添加任务对话框 */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            width: "80vw",
            maxWidth: 1000,
            minHeight: 360,
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ color: "#1a237e", fontWeight: "bold" }}>
          添加新任务
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              alignItems: "stretch",
              minWidth: "60vw",
              maxWidth: "90vw",
            }}
          >
            <Box sx={{ flex: 1 }}>
              <TextField
                margin="dense"
                inputRef={inputRef}
                label="任务内容（支持 Markdown）"
                placeholder="TODO..."
                fullWidth
                multiline
                rows={6}
                value={newTaskContent}
                onChange={(e) => setNewTaskContent(e.target.value)}
                onKeyDown={(e: any) => {
                  // Enter 换行，Cmd/Ctrl+Enter 提交任务
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    addTask();
                  }
                }}
                variant="outlined"
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  mt: 1,
                  "& .MuiOutlinedInput-root": {
                    "&:hover fieldset": {
                      borderColor: "#1a237e",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#1a237e",
                    },
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#1a237e",
                  },
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: "text.secondary", mt: 1 }}
              >
                Enter 换行，Cmd/Ctrl+Enter 提交
              </Typography>
            </Box>

            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                p: 2,
                backgroundColor: "#fafafa",
                maxHeight: 420,
                overflow: "auto",
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1, color: "#1a237e" }}>
                实时预览
              </Typography>
              <Box
                sx={{
                  textAlign: "left",
                  "& > *": { textAlign: "left" },
                  "& img": { maxWidth: "100%" },
                  "& ul, & ol": {
                    paddingLeft: "1.2em",
                    margin: "0.5em 0",
                    listStylePosition: "outside",
                  },
                  "& li": {
                    display: "list-item",
                    paddingLeft: "0.3em",
                    marginBottom: "0.3em",
                  },
                }}
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownToHtml(newTaskContent || ""),
                }}
              />
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setOpenDialog(false)}
            sx={{
              color: "#1a237e",
              "&:hover": {
                backgroundColor: "rgba(26, 35, 126, 0.1)",
              },
            }}
          >
            取消
          </Button>
          <Button
            onClick={addTask}
            variant="contained"
            sx={{
              backgroundColor: "#1a237e",
              "&:hover": {
                backgroundColor: "#0d47a1",
              },
            }}
          >
            添加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
