import {
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";

function Confirm({
  open,
  content,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  content: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ color: "#dc3545", fontWeight: "bold" }}>
        注意
      </DialogTitle>
      <DialogContent>
        <Typography>{content}</Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onCancel}
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
          onClick={onConfirm}
          variant="contained"
          sx={{
            backgroundColor: "#c21919",
            "&:hover": {
              backgroundColor: "#dc3545",
            },
          }}
        >
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default Confirm;
