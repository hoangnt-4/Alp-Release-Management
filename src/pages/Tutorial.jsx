import React, { useState } from 'react'

const SECTIONS = [
  {
    icon: '⌂',
    title: 'Dashboard',
    color: '#0d9488',
    steps: [
      'Xem danh sách bản phát hành mới nhất của tất cả app.',
      'Nhấn "+ Thêm bản phát hành" để tạo bản mới: chọn App, nhập Version, Release Date, Roll-out và Release Note.',
      'Nhấn "✓ Review" trên mỗi dòng để cập nhật Status review, Reviewer và Review Notes.',
      'Nhấn tên app để mở chi tiết, nhấn ☆ để thêm vào Xem Sau.',
      '⚡ badge màu vàng = app đang có Request Update.',
    ],
  },
  {
    icon: '≡',
    title: 'Lịch sử phát hành',
    color: '#6366f1',
    steps: [
      'Toàn bộ lịch sử phát hành, hỗ trợ tìm kiếm theo tên app, version, mô tả.',
      'Filter theo Status, Nền tảng, Roll-out, khoảng ngày.',
      'Nhấn tên app để chỉnh sửa nhanh thông tin bản phát hành.',
      'Nhấn "✓ Review" để cập nhật trạng thái review.',
      'Nhấn "Import" (góc trên phải) để nhập hàng loạt từ file Excel.',
    ],
  },
  {
    icon: '⊞',
    title: 'Apps',
    color: '#f59e0b',
    steps: [
      'Danh sách tất cả app, click để xem chi tiết.',
      'Sidebar trái có sub-tab lọc theo Status: Running / Pending / Unpublished / Abandoned.',
      'Filter "⚡ Request Update" để chỉ hiện app đang có request.',
      'Mỗi app hiển thị mini-timeline (Figma → Dev → Test → Live).',
    ],
  },
  {
    icon: '📋',
    title: 'Chi tiết App (AppDetailModal)',
    color: '#0d9488',
    steps: [
      'Cột trái: Timeline dự án (Figma / Dev / Test / Live Full Ads / Live iAP).',
      'Bên dưới Timeline: Update Request #1, #2... và Live Local Noti #1, #2... tự động lấy từ release note.',
      'Tab Activities: trạng thái Show Intro, Config Show, Local Noti; toggle Request Update; nhập Link Request (tối đa 4 link, nhấn "+" để thêm).',
      'Tab Phát hành: toàn bộ lịch sử phát hành của app đó.',
    ],
  },
  {
    icon: '◉',
    title: 'Xem Sau (Watchlist)',
    color: '#8b5cf6',
    steps: [
      'Danh sách app bạn đã đánh dấu ☆ để theo dõi.',
      'Nhấn ☆ lần nữa trên Dashboard hoặc trong Chi tiết App để bỏ theo dõi.',
    ],
  },
  {
    icon: '↗',
    title: 'Thống kê',
    color: '#ec4899',
    steps: [
      'Biểu đồ phát hành theo tháng (12 tháng gần nhất).',
      'Phân bổ theo Status review (Checked / Updated / Pending...).',
      'Tỷ lệ iOS vs Android.',
      'Top 10 app nhiều bản phát hành nhất.',
      'Top 10 app có Update Request nhiều nhất.',
    ],
  },
  {
    icon: '⟳',
    title: 'Thao tác chung',
    color: '#64748b',
    steps: [
      '"Làm mới dữ liệu" (sidebar dưới): đồng bộ lại toàn bộ dữ liệu từ Lark.',
      '"Xuất CSV" (sidebar dưới): tải toàn bộ lịch sử phát hành về máy.',
      'Import Excel (History page): kéo thả hoặc chọn file .xlsx để nhập hàng loạt.',
      'Sidebar có thể thu gọn bằng nút ← / → ở góc trên phải.',
    ],
  },
]

export default function Tutorial() {
  const [open, setOpen] = useState(null)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Hướng dẫn sử dụng</h1>
        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>Nhấn vào từng mục để xem chi tiết</p>
      </div>

      <div className="space-y-3">
        {SECTIONS.map((s, i) => {
          const isOpen = open === i
          return (
            <div key={i} className="card overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors"
                style={{ background: isOpen ? `${s.color}10` : '' }}
                onClick={() => setOpen(isOpen ? null : i)}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm shrink-0"
                  style={{ background: s.color }}>
                  {s.icon}
                </div>
                <span className="font-medium text-sm flex-1">{s.title}</span>
                <span className="text-sm transition-transform" style={{ color: '#94a3b8', transform: isOpen ? 'rotate(180deg)' : '' }}>▾</span>
              </button>

              {isOpen && (
                <div className="px-5 pb-4 border-t border-surface-100">
                  <ol className="mt-3 space-y-2">
                    {s.steps.map((step, j) => (
                      <li key={j} className="flex gap-3 text-sm" style={{ color: '#475569' }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                          style={{ background: `${s.color}18`, color: s.color }}>
                          {j + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="card p-5 text-xs space-y-1" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
        <p className="font-semibold" style={{ color: '#065f46' }}>💡 Tips</p>
        <p style={{ color: '#047857' }}>• Dữ liệu đồng bộ realtime với Lark Bitable — luôn nhấn "Làm mới" sau khi thao tác trực tiếp trên Lark.</p>
        <p style={{ color: '#047857' }}>• Release Note chứa "update request" → tự động tạo mốc Update Request trong timeline app.</p>
        <p style={{ color: '#047857' }}>• Release Note chứa "local noti" → tự động tạo mốc Live Local Noti trong timeline app.</p>
        <p style={{ color: '#047857' }}>• Request Update tự động OFF khi bản phát hành mới nhất có note "update request".</p>
      </div>
    </div>
  )
}
