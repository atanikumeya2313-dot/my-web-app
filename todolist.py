from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI()

class Todo(BaseModel):
    id: int
    title: str
    due_date: Optional[str] = None
    done: bool = False
    repeat: str = "なし"  # なし・毎日・毎週・毎月
    priority: str = "中"  # 高・中・低

todos: List[Todo] = []
next_id = 1

@app.get("/", response_class=HTMLResponse)
def index():
    incomplete = [t for t in todos if not t.done]
    complete = [t for t in todos if t.done]

    priority_icon = {"高": "🔴", "中": "🟡", "低": "🟢"}
    repeat_icon = {"なし": "", "毎日": "🔁毎日", "毎週": "🔁毎週", "毎月": "🔁毎月"}

    def render_items(items):
        html = ""
        for todo in items:
            status = "✅" if todo.done else "⬜"
            due = f"　📅{todo.due_date}" if todo.due_date else ""
            rep = f"　{repeat_icon[todo.repeat]}" if todo.repeat != "なし" else ""
            pri = priority_icon.get(todo.priority, "🟡")
            html += f"""
            <li style="margin:8px 0;">
                {status} {pri} {todo.title}{due}{rep}
                <button onclick="complete({todo.id})">完了</button>
                <button onclick="remove({todo.id})">削除</button>
            </li>
            """
        return html if html else "<li>なし</li>"

    # カレンダー用のTodo日付リスト
    todo_dates = [t.due_date for t in todos if t.due_date]
    todo_dates_js = str(todo_dates).replace("'", '"')

    return f"""
    <html>
    <head>
        <meta charset="utf-8">
        <title>TODOリスト</title>
        <style>
            body {{ font-family: sans-serif; display: flex; gap: 40px; padding: 20px; }}
            #left {{ flex: 1; }}
            #right {{ width: 300px; }}
            .calendar {{ border-collapse: collapse; width: 100%; }}
            .calendar th, .calendar td {{ border: 1px solid #ccc; text-align: center; padding: 6px; }}
            .calendar th {{ background: #4a90d9; color: white; }}
            .has-todo {{ background: #ffe082; font-weight: bold; }}
            .today {{ background: #a5d6a7; font-weight: bold; }}
            input, select {{ margin: 4px; padding: 6px; }}
            button {{ margin: 2px; padding: 4px 8px; cursor: pointer; }}
            h2 {{ border-left: 4px solid #4a90d9; padding-left: 8px; }}
        </style>
    </head>
    <body>
        <div id="left">
            <h1>📝 TODOリスト</h1>
            <div>
                <input id="title" type="text" placeholder="やることを入力" style="width:200px;">
                <input id="due_date" type="date">
                <select id="priority">
                    <option value="高">🔴 優先度：高</option>
                    <option value="中" selected>🟡 優先度：中</option>
                    <option value="低">🟢 優先度：低</option>
                </select>
                <select id="repeat">
                    <option value="なし">繰り返し：なし</option>
                    <option value="毎日">🔁 毎日</option>
                    <option value="毎週">🔁 毎週</option>
                    <option value="毎月">🔁 毎月</option>
                </select>
                <button onclick="addTodo()">追加</button>
            </div>

            <h2>⬜ 未完了</h2>
            <ul>{render_items(incomplete)}</ul>

            <h2>✅ 完了済み</h2>
            <ul>{render_items(complete)}</ul>
        </div>

        <div id="right">
            <h2>📅 カレンダー</h2>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <button onclick="prevMonth()">◀</button>
                <span id="month-label"></span>
                <button onclick="nextMonth()">▶</button>
            </div>
            <table class="calendar" id="calendar"></table>
            <div style="margin-top:8px; font-size:0.85em;">
                🟡 TODO期限あり　🟢 今日
            </div>
        </div>

        <script>
            const todoDates = {todo_dates_js};
            let current = new Date();

            function renderCalendar() {{
                const year = current.getFullYear();
                const month = current.getMonth();
                document.getElementById('month-label').textContent = `${{year}}年${{month+1}}月`;

                const today = new Date();
                const firstDay = new Date(year, month, 1).getDay();
                const lastDate = new Date(year, month + 1, 0).getDate();

                let html = '<tr><th>日</th><th>月</th><th>火</th><th>水</th><th>木</th><th>金</th><th>土</th></tr><tr>';
                for (let i = 0; i < firstDay; i++) html += '<td></td>';

                for (let d = 1; d <= lastDate; d++) {{
                    const dateStr = `${{year}}-${{String(month+1).padStart(2,'0')}}-${{String(d).padStart(2,'0')}}`;
                    const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
                    const hasTodo = todoDates.includes(dateStr);
                    let cls = isToday ? 'today' : hasTodo ? 'has-todo' : '';
                    html += `<td class="${{cls}}">${{d}}</td>`;
                    if ((firstDay + d) % 7 === 0) html += '</tr><tr>';
                }}
                html += '</tr>';
                document.getElementById('calendar').innerHTML = html;
            }}

            function prevMonth() {{
                current.setMonth(current.getMonth() - 1);
                renderCalendar();
            }}

            function nextMonth() {{
                current.setMonth(current.getMonth() + 1);
                renderCalendar();
            }}

            renderCalendar();

            async function addTodo() {{
                const title = document.getElementById('title').value;
                const due_date = document.getElementById('due_date').value;
                const priority = document.getElementById('priority').value;
                const repeat = document.getElementById('repeat').value;
                let url = '/todos?title=' + encodeURIComponent(title);
                if (due_date) url += '&due_date=' + due_date;
                url += '&priority=' + encodeURIComponent(priority);
                url += '&repeat=' + encodeURIComponent(repeat);
                await fetch(url, {{method: 'POST'}});
                location.reload();
            }}

            async function complete(id) {{
                await fetch('/todos/' + id + '/done', {{method: 'PUT'}});
                location.reload();
            }}

            async function remove(id) {{
                await fetch('/todos/' + id, {{method: 'DELETE'}});
                location.reload();
            }}
        </script>
    </body>
    </html>
    """

@app.get("/todos")
def get_todos():
    return todos

@app.post("/todos")
def add_todo(title: str, due_date: Optional[str] = None, priority: str = "中", repeat: str = "なし"):
    global next_id
    todo = Todo(id=next_id, title=title, due_date=due_date, priority=priority, repeat=repeat)
    todos.append(todo)
    next_id += 1
    return todo

@app.put("/todos/{todo_id}/done")
def complete_todo(todo_id: int):
    for todo in todos:
        if todo.id == todo_id:
            todo.done = True
            return todo
    return {"error": "見つかりません"}

@app.delete("/todos/{todo_id}")
def delete_todo(todo_id: int):
    global todos
    todos = [t for t in todos if t.id != todo_id]
    return {"message": "削除しました"}