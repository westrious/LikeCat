import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { renderMarkdownToHtml } from "./utils/markdown";
import { main } from "../wailsjs/go/models";

function Editor({
  open,
  task,
  taskContent,
  onClose,
  onTaskContentChange,
  onSubmit,
}: {
  open: boolean;
  task: main.Task | null;
  taskContent: string;
  onClose: () => void;
  onTaskContentChange: (content: string) => void;
  onSubmit: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (open) {
      // 延迟一帧，确保 TextField 已挂载，然后 focus
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        // 光标到末尾
        inputRef.current?.setSelectionRange(
          taskContent.length,
          taskContent.length
        );
      });
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          width: "80vw",
          maxWidth: 2000,
          minHeight: 360,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ color: "#1a237e", fontWeight: "bold" }}>
        {task ? "编辑任务" : "添加新任务"}
      </DialogTitle>
      {task ? (
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: "0.7rem",
            marginTop: "-1rem",
          }}
        >
          创建时间：{new Date(task.create_time).toLocaleString()}
        </Typography>
      ) : null}
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
              value={taskContent}
              onChange={(e) => onTaskContentChange(e.target.value)}
              onKeyDown={(e: any) => {
                // Enter 换行，Cmd/Ctrl+Enter 提交任务
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  onSubmit();
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
                __html: renderMarkdownToHtml(taskContent || ""),
              }}
            />
          </Paper>
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
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
          onClick={onSubmit}
          variant="contained"
          sx={{
            backgroundColor: "#1a237e",
            "&:hover": {
              backgroundColor: "#0d47a1",
            },
          }}
        >
          {task ? "保存" : "添加"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Editor;
