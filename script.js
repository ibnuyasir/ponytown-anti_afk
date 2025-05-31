var debug_mode = false;
var interval_id = null;
var timeout = null;
var active = true;
var drag = false;
var x = window.innerWidth - 60;
var y = 10;
var X, Y;
var icons, menu, welcome_box, btn, times;
var last_time = performance.now();
var frames = 0;
var fps = 0;
var fps_display = null;
var cpu_usage = 0;
var cpu_display = null;
var cpu_check_interval = null;
var performance_start_time = 0;
var last_cpu_update = 0;

let DEFAULT_INTERVAL = 15000;


let time_options = Object.freeze([
{
    label: '15 minutes',
    value: 0
},
{
    label: '20 minutes',
    value: 20 * 60 * 1000
},
{
    label: '1 hour',
    value: 60 * 60 * 1000
},
{
    label: '2 hours',
    value: 2 * 60 * 60 * 1000
},
{
    label: '3 hours',
    value: 3 * 60 * 60 * 1000
},
{
    label: 'Never got AFK',
    value: Math.PI * 10 * 60 * 60 * 1000
}]);
let init = {
    DEBUG: function(message, data)
    {
        if (debug_mode)
        {
            console.log(`%c[DEBUG] ${message}`, 'color: #0088ff', data || '');
        }
    },
    CLEANUP: function()
    {
        init.DEBUG('reset_resources');
        if (interval_id)
        {
            clearInterval(interval_id);
            interval_id = null;
        }
        if (timeout)
        {
            clearTimeout(timeout);
            timeout = null;
        }
        if (cpu_check_interval)
        {
            clearInterval(cpu_check_interval);
            cpu_check_interval = null;
        }
        if (icons)
        {
            icons.removeEventListener('mousedown', init.HANDLE_MOUSE_DOWN);
            icons.removeEventListener('click', init.TOGGLE_MENU);
        }
        if (btn)
        {
            btn.removeEventListener('click', init.TOGGLE_BYPASS);
        }
        if (times)
        {
            times.removeEventListener('change', init.HANDLE_TIME_CHANGE);
        }
        document.removeEventListener('mousemove', init.HANDLE_MOUSE_MOVE);
        document.removeEventListener('mouseup', init.HANDLE_MOUSE_UP);
        document.removeEventListener('click', init.HANDLE_DOCUMENT_CLICK);
        cancelAnimationFrame(init.UPDATE_PERFORMANCE);
    },
    ACTIVITY: function()
    {
        try
        {
            let components = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'][Math.floor(Math.random() * 4)];
            let event_handler = new KeyboardEvent('keydown',
            {
                key: components,
                bubbles: true
            });
            document.dispatchEvent(event_handler);
            let mouse_event = new MouseEvent('mousemove',
            {
                bubbles: true,
                clientX: Math.random() * window.innerWidth,
                clientY: Math.random() * window.innerHeight
            });
            document.dispatchEvent(mouse_event);
            init.DEBUG(
            {
                key: components,
                mouse_move: true
            });
        }
        catch (e)
        {
            console.error('Activity simulation failed:', e);
            init.DEBUG('Activity simulation error', e);
        }
    },
    HANDLE_MOUSE_DOWN: function(e)
    {
        X = e.clientX - x;
        Y = e.clientY - y;
        drag = true;
        init.DEBUG('icon_down', {
            x,
            y,
            clientX: e.clientX,
            clientY: e.clientY,
            offsetX: X,
            offsetY: Y
        });
    },
    HANDLE_MOUSE_MOVE: function(e)
    {
        if (drag)
        {
            e.preventDefault();
            x = e.clientX - X;
            y = e.clientY - Y;
            x = Math.max(0, Math.min(x, window.innerWidth - icons.offsetWidth));
            y = Math.max(0, Math.min(y, window.innerHeight - icons.offsetHeight));
            icons.style.left = `${x}px`;
            icons.style.top = `${y}px`;
            icons.style.right = 'auto';
            menu.style.left = `${x}px`;
            menu.style.top = `${y + 40}px`;
            menu.style.right = 'auto';
            init.DEBUG('icon_pos',
            {
                x,
                y
            });
        }
    },
    HANDLE_MOUSE_UP: function()
    {
        drag = false;
    },
    TOGGLE_MENU: function(e)
    {
        if (!drag)
        {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        }
        e.stopPropagation();
    },
    HANDLE_DOCUMENT_CLICK: function(e)
    {
        if (!menu.contains(e.target) && !icons.contains(e.target))
        {
            menu.style.display = 'none';
        }
    },
    TOGGLE_BYPASS: function()
    {
        if (active)
        {
            clearInterval(interval_id);
            interval_id = null;
            btn.textContent = 'Enable';
            btn.style.backgroundColor = '#44ff44';
            active = false;
            init.DEBUG('disabled');
        }
        else
        {
            if (interval_id)
            {
                clearInterval(interval_id);
            }
            interval_id = setInterval(init.ACTIVITY, DEFAULT_INTERVAL);
            btn.textContent = 'Disable';
            btn.style.backgroundColor = '#ff4444';
            active = true;
            
            init.DEBUG('enabled');
        }
    },
    HANDLE_TIME_CHANGE: function()
    {
        let select_time = parseInt(times.value);
        init.DEBUG('time', {
            value: select_time
        });
        
        if (timeout)
        {
            clearTimeout(timeout);
            timeout = null;
        }
        if (select_time !== Infinity && active)
        {
            timeout = setTimeout(function() 
            {
                if (interval_id)
                {
                    clearInterval(interval_id);
                    interval_id = null;
                }
                btn.textContent = 'Enable';
                btn.style.backgroundColor = '#44ff44';
                active = false;
                init.DEBUG('auto disabled after: ', {
                    timeout: select_time
                });
            }, select_time);
        }
    },
    CREATE_WELCOME_MESSAGE: function()
    {
        welcome_box = document.createElement('div');
        let close_btn = document.createElement('button');
        let title = document.createElement('h2');
        let info = document.createElement('p');
        let features = document.createElement('ul');
        let feature_items = [
            'Adjustable timeout duration',
            'Draggable control icon', 
            'Performance monitoring ( FPS )'
        ];
        let debug_toggle = document.createElement('div');
        let debug_checkbox = document.createElement('input');
        let debug_label = document.createElement('label');
        let support = document.createElement('p');
        let github_link = document.createElement('a');
        
        welcome_box.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
        welcome_box.style.position = 'fixed';
        welcome_box.style.top = '50%';
        welcome_box.style.left = '50%';
        welcome_box.style.transform = 'translate(-50%, -50%)';
        welcome_box.style.width = '50%';
        welcome_box.style.backgroundColor = 'black';
        welcome_box.style.color = '#fff';
        welcome_box.style.padding = '20px';
        welcome_box.style.borderRadius = '5px';
        welcome_box.style.boxShadow = '0px 0px 5px 4px blue';
        welcome_box.style.zIndex = '1001';
        
        close_btn.textContent = '✕';
        close_btn.style.position = 'absolute';
        close_btn.style.top = '5px';
        close_btn.style.fontWeight = 'bold';
        close_btn.style.right = '5px';
        close_btn.style.color = '#fff';
        close_btn.style.border = 'none';
        close_btn.style.width = '25px';
        close_btn.style.height = '25px';
        close_btn.style.cursor = 'pointer';
        close_btn.style.display = 'flex';
        close_btn.style.alignItems = 'center';
        close_btn.style.justifyContent = 'center';
        
        title.textContent = 'ANTI AFK TOOLS';
        title.style.fontWeight = 'bold';
        title.style.margin = '0 0 15px 0';
        title.style.textAlign = 'center';

        info.textContent = 'Enjoy';
        info.style.lineHeight = '1.5';

        features.style.marginTop = '15px';
        features.style.paddingLeft = '20px';

        debug_toggle.style.marginTop = '15px';
        debug_toggle.style.display = 'flex';
        debug_toggle.style.alignItems = 'center';
         
        debug_checkbox.type = 'checkbox';
        debug_checkbox.id = 'debug-toggle';
        debug_checkbox.style.marginRight = '10px';

        debug_label.htmlFor = 'debug-toggle';
        debug_label.textContent = 'Enable Debug Mode';

        support.style.marginTop = '15px';
        support.textContent = 'This code on repository: ';

        github_link.href = 'https://github.com/ibnuyasir/ponytown-anti_afk';
        github_link.textContent = 'https://ibnuyasir/ponytown-anti_afk';
        github_link.style.color = 'blue';
        github_link.style.cursor = 'pointer';

        close_btn.addEventListener('click', function ()
        {
            welcome_box.style.display = 'none';
            init.DEBUG('UI_MSG_closed');
        });
        feature_items.forEach(function (item)
        {
            let li = document.createElement('li');
            li.textContent = item;
            li.style.marginBottom = '5px';
            features.appendChild(li);
        });
        debug_checkbox.addEventListener('change', function (e)
        {
            debug_mode = e.target.checked;
            init.DEBUG('ACTIVATED',
            {
                enabled: debug_mode
            });
        });
        github_link.addEventListener('click', function ()
        {
            window.open('https://discord.com/users/1009995898752860190', '_blank');
        });

        welcome_box.appendChild(close_btn);
        welcome_box.appendChild(title);
        welcome_box.appendChild(info);
        welcome_box.appendChild(features);
        welcome_box.appendChild(support);
        welcome_box.appendChild(debug_toggle);

        support.appendChild(github_link);

        debug_toggle.appendChild(debug_checkbox);
        debug_toggle.appendChild(debug_label);

        document.body.appendChild(welcome_box);
    },
    UPDATE_PERFORMANCE: function()
    {
        let current_time = performance.now();
        frames++;
        if (current_time > last_time + 1000)
        {
            fps = Math.round((frames * 1000) / (current_time - last_time));
            frames = 0;
            last_time = current_time;
            if (fps_display)
            {
                fps_display.textContent = `FPS: ${fps}`;
            }
        }
        requestAnimationFrame(init.UPDATE_PERFORMANCE);
    },
    ESTIMATE_CPU_USAGE: function()
    {
        let start_time = performance.now();
        var end_time;
        for (var i = 0; i < 1000000; i++)
        {
            Math.sqrt(i);
        }
        end_time = performance.now();
        let execution_time = end_time - start_time;
        let idle_time = performance_start_time > 0 ? start_time - performance_start_time - last_cpu_update : 0;
        if (idle_time > 0)
        {
            cpu_usage = Math.min(100, Math.round((execution_time / (execution_time + idle_time)) * 100));
            if (cpu_display)
            {
                cpu_display.textContent = `CPU: ${cpu_usage}%`;
                if (cpu_usage < 30)
                {
                    cpu_display.style.color = '#44ff44';
                }
                else if (cpu_usage < 70)
                {
                    cpu_display.style.color = '#ffff44';
                }
                else
                {
                    cpu_display.style.color = '#ff4444';
                }
            }
        }
        performance_start_time = end_time;
        last_cpu_update = execution_time;
    },
    CREATE_UI: function()
    {
        icons = document.createElement('div');
        let img = document.createElement('img');
        menu = document.createElement('div');
        let title = document.createElement('div');
        let time_label = document.createElement('div');
        times = document.createElement('select');
        btn = document.createElement('button');
        let debug_container = document.createElement('div');
        let debug_check = document.createElement('input');
        let debug_label = document.createElement('label');
        let performance_container = document.createElement('div');
        let status_container = document.createElement('div');
        let status_indicator = document.createElement('div');
        let original_toggle_bypass = init.TOGGLE_BYPASS;

        icons.style.position = 'fixed';
        icons.style.top = '10px';
        icons.style.right = '10px';
        icons.style.display = 'flex';
        icons.style.alignItems = 'center';
        icons.style.justifyContent = 'center';
        icons.style.backgroundColor = '#fff';
        icons.style.padding = '5px';
        icons.style.borderRadius = '50%';
        icons.style.cursor = 'move';
        icons.style.zIndex = '1000';
        icons.style.userSelect = 'none';
        icons.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.2)';
        
        img.src = 'https://avatars.githubusercontent.com/u/137759149?v=4';
        img.style.width = '50px';
        img.style.height = '50px';
        img.style.borderRadius = '50%';
        img.alt = 'Avatar';
        
        menu.style.position = 'fixed';
        menu.style.top = '50px';
        menu.style.right = '10px';
        menu.style.backgroundColor = 'black';
        menu.style.color = '#fff';
        menu.style.padding = '15px';
        menu.style.borderRadius = '5px';
        menu.style.display = 'none';
        menu.style.zIndex = '1000';
        menu.style.boxShadow = '0 2px 6px blue';
        menu.style.minWidth = '200px';

        title.textContent = 'ANTI AFK';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '15px';
        title.style.textAlign = 'center';
        title.style.fontSize = '16px';

        btn.textContent = 'Disable';
        btn.style.backgroundColor = '#ff4444';
        btn.style.color = '#fff';
        btn.style.border = 'none';
        btn.style.padding = '8px 10px';
        btn.style.borderRadius = '3px';
        btn.style.cursor = 'pointer';
        btn.style.marginBottom = '15px';
        btn.style.width = '100%';
        btn.style.fontWeight = 'bold';

        time_label.textContent = 'disable after:';
        time_label.style.marginBottom = '5px';

        times.style.backgroundColor = '#555';
        times.style.color = '#fff';
        times.style.border = 'none';
        times.style.padding = '8px';
        times.style.borderRadius = '3px';
        times.style.width = '100%';
        times.style.cursor = 'pointer';
        times.style.marginBottom = '15px';

        debug_container.style.display = 'flex';
        debug_container.style.alignItems = 'center';
        
        debug_check.type = 'checkbox';
        debug_check.id = `debug_${Math.random().toString(36).substr(2, 9)}`;
        debug_check.style.marginRight = '8px';

        debug_label.htmlFor = debug_check.id;
        debug_label.textContent = 'Enable Debug Mode';

        performance_container.style.marginTop = '15px';
        performance_container.style.marginBottom = '15px';
        performance_container.style.padding = '8px';
        performance_container.style.backgroundColor = '#333';
        performance_container.style.borderRadius = '3px';
        performance_container.style.fontSize = '14px';
        
        fps_display = document.createElement('div');
        fps_display.textContent = 'FPS: 0';
        fps_display.style.marginBottom = '5px';
        fps_display.style.color = '#44ff44';
        
        cpu_display = document.createElement('div');
        cpu_display.textContent = 'CPU: 0%';
        cpu_display.style.color = '#44ff44';
        
        status_container.style.marginTop = '5px';
        status_container.style.textAlign = 'center';
        status_container.style.fontSize = '12px';
        
        status_indicator.textContent = '● Active';
        status_indicator.style.color = '#44ff44';

        icons.appendChild(img);

        menu.appendChild(title);
        menu.appendChild(btn);
        menu.appendChild(time_label);
        menu.appendChild(times);

        debug_container.appendChild(debug_check);
        debug_container.appendChild(debug_label);
        menu.appendChild(debug_container);
        
        performance_container.appendChild(fps_display);
        performance_container.appendChild(cpu_display);
        menu.appendChild(performance_container);

        status_container.appendChild(status_indicator);

        menu.appendChild(status_container);

        document.body.appendChild(icons);
        document.body.appendChild(menu);
        
        
        time_options.forEach(function (option)
        {
            let opt = document.createElement('option');
            opt.value = option.value;
            opt.textContent = option.label;
            times.appendChild(opt);
        });
        debug_check.addEventListener('change', (e) =>
        {
            debug_mode = e.target.checked;
            init.DEBUG('menu',
            {
                enabled: debug_mode
            });
            let welcome_checkbox = document.getElementById('debug-toggle');
            if (welcome_checkbox)
            {
                welcome_checkbox.checked = debug_mode;
            }
        });
        init.TOGGLE_BYPASS = function()
        {
            original_toggle_bypass();
            status_indicator.textContent = active ? '● Active' : '○ Inactive';
            status_indicator.style.color = active ? '#44ff44' : '#ff4444';
        };
        init.DEBUG('_menu');
        
        icons.addEventListener('mousedown', init.HANDLE_MOUSE_DOWN);
        icons.addEventListener('click', init.TOGGLE_MENU);
        
        document.addEventListener('mousemove', init.HANDLE_MOUSE_MOVE);
        document.addEventListener('mouseup', init.HANDLE_MOUSE_UP);
        document.addEventListener('click', init.HANDLE_DOCUMENT_CLICK);
        
        btn.addEventListener('click', init.TOGGLE_BYPASS);
        times.addEventListener('change', init.HANDLE_TIME_CHANGE);
        init.DEBUG('Event listeners attached');
    },
    START: function()
    {
        init.DEBUG('Starting.......');
        init.CLEANUP();
        init.CREATE_UI();
        init.CREATE_WELCOME_MESSAGE();
        
        if (interval_id) {
            clearInterval(interval_id);
        }
        interval_id = setInterval(init.ACTIVITY, DEFAULT_INTERVAL);
        init.DEBUG('success',
        {
            interval: DEFAULT_INTERVAL
        });
        requestAnimationFrame(init.UPDATE_PERFORMANCE);
        
        if (cpu_check_interval) {
            clearInterval(cpu_check_interval);
        }
        cpu_check_interval = setInterval(init.ESTIMATE_CPU_USAGE, 2000);
        window.addEventListener('unload', init.CLEANUP);
    }
};
init.START();
