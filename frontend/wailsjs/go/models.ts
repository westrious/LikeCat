export namespace main {
	
	export class Task {
	    id: string;
	    content: string;
	    x: number;
	    y: number;
	    width?: number;
	
	    static createFrom(source: any = {}) {
	        return new Task(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.content = source["content"];
	        this.x = source["x"];
	        this.y = source["y"];
	        this.width = source["width"];
	    }
	}

}

