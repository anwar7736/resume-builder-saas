type ConfirmationAlertOptions = {
  title: string;
  text: string;
  confirmButtonText: string;
};

export async function confirmWithSweetAlert({
  title,
  text,
  confirmButtonText,
}: ConfirmationAlertOptions): Promise<boolean> {
  const { default: Swal } = await import("sweetalert2");
  const result = await Swal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText,
    cancelButtonText: "Cancel",
    reverseButtons: true,
    focusCancel: true,
    backdrop: "rgba(3, 7, 18, 0.78)",
    background: "#1b202b",
    color: "#f8fafc",
    iconColor: "#fbbf24",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#3b4555",
    customClass: {
      popup: "resume-swal-popup",
      title: "resume-swal-title",
      htmlContainer: "resume-swal-message",
      cancelButton: "resume-swal-cancel",
      confirmButton: "resume-swal-confirm",
    },
  });
  return result.isConfirmed;
}
